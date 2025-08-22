/**
 * This file defines the tools available to the ReAct agent.
 * Tools are functions that the agent can use to interact with external systems or perform specific tasks.
 */
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { bigquery } from "./bigqueryClient.js";

/**
 * Tavily search tool configuration
 * This tool allows the agent to perform web searches using the Tavily API.
 */
const searchTavily = new TavilySearchResults({
  maxResults: 3,
});

/**
 * BigQuery configuration from environment variables
 */
const BQ_LOCATION = process.env.BQ_LOCATION;

function getBQEnv() {
  const projectId =
    process.env.BQ_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;
  const dataset = process.env.BQ_DATASET;
  const table = process.env.BQ_TABLE;
  return { projectId, dataset, table };
}

function requireBQEnv() {
  const { projectId, dataset, table } = getBQEnv();
  if (!projectId || !dataset || !table) {
    throw new Error(
      "Missing BigQuery configuration: BQ_PROJECT_ID, BQ_DATASET, and BQ_TABLE are required",
    );
  }
  return { projectId, dataset, table };
}

// --- Table schema introspection utilities ---
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

let cachedTableColumns: string[] | null = null;

async function getTableColumns(): Promise<string[]> {
  if (cachedTableColumns) return cachedTableColumns;
  const { dataset, table } = requireBQEnv();
  const tableRef = bigquery.dataset(dataset).table(table);
  const [metadata] = await tableRef.getMetadata();
  const fields: any[] = metadata?.schema?.fields || [];
  const cols: string[] = [];
  const walk = (fs: any[]) => {
    for (const f of fs) {
      cols.push(String(f.name));
      if (f.fields && Array.isArray(f.fields)) walk(f.fields);
    }
  };
  walk(fields);
  cachedTableColumns = cols;
  return cols;
}

async function resolveColumns(): Promise<{
  names: Record<string, string>;
}> {
  const cols = await getTableColumns();
  const index = new Map<string, string>();
  for (const c of cols) {
    index.set(stripDiacritics(c.toLowerCase()), c);
  }
  const pick = (...cands: string[]): string => {
    for (const cand of cands) {
      const k = stripDiacritics(cand.toLowerCase());
      const found = index.get(k);
      if (found) return found;
    }
    // Fallback to the first candidate as-is (uppercased), even if not present
    return cands[0].toUpperCase();
  };
  return {
    names: {
      ano: pick("ANO", "AÑO", "ANIO"),
      mes: pick("MES"),
      producto: pick("PRODUCTO", "SKU", "ITEM"),
      marca: pick("MARCA", "BRAND"),
      cadena: pick("CADENA", "CHAIN"),
      estado: pick("ESTADO", "STATE"),
      tienda: pick("TIENDA", "STORE"),
      venta: pick("VENTA", "VENTAS", "SALES"),
      botellas: pick("BOTELLAS", "BOTELLA", "BOTTLES"),
    },
  };
}

// Replace free-form identifier tokens with actual column names (backticked), skipping string literals
async function normalizeIdentifiersInSQL(sql: string): Promise<string> {
  const { names } = await resolveColumns();
  const synonymList: Array<{ canonical: string; cands: string[] }> = [
    // Only normalize AÑO/ANO/ANIO to the actual column to fix the recurring issue
    { canonical: names.ano, cands: ["AÑO", "ANO", "ANIO"] },
  ];

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Split by single-quoted strings to avoid replacing inside string literals
  const parts = sql.split(/('(?:[^'\\]|\\.)*')/g);
  for (let i = 0; i < parts.length; i++) {
    // Even indices = outside quotes
    if (i % 2 === 0) {
      let segment = parts[i];
      for (const entry of synonymList) {
        for (const cand of entry.cands) {
          // Use ASCII class for word-ish boundaries to avoid Unicode property escapes
          const pat = new RegExp(
            '(^|[^A-Za-z0-9_`])(' + escapeRegex(cand) + ')(?=$|[^A-Za-z0-9_])',
            'giu',
          );
          segment = segment.replace(pat, (_m, pre) => `${pre}\`${entry.canonical}\``);
        }
      }
      parts[i] = segment;
    }
  }
  return parts.join("");
}

/**
 * BigQueryTool — executes arbitrary SQL in BigQuery and returns rows
 */
const SQLSchema = z.object({ sql: z.string().min(10) });

function stripComments(sql: string): string {
  return sql
    // Remove block comments
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    // Remove line comments
    .replace(/--.*$/gm, " ")
    .trim();
}

function validateQuery(sql: string) {
  const s = stripComments(sql).toLowerCase();
  // Must start with WITH or SELECT
  if (!/^(with|select)\b/.test(s)) {
    throw new Error("Only read-only SELECT queries (WITH/SELECT) are allowed");
  }
  // Forbid DDL/DML keywords
  const forbidden =
    /(insert|update|delete|merge|create|drop|alter|truncate|grant|revoke|replace)\b/;
  if (forbidden.test(s)) {
    throw new Error("Only read-only queries are allowed");
  }
  // Must reference the canonical table
  const { dataset, table } = requireBQEnv();
  const requiredRef = `${dataset}.${table}`.toLowerCase();
  if (!s.includes(requiredRef)) {
    throw new Error(
      "Query must reference the configured canonical table (dataset.table)",
    );
  }
}

async function runSQL(o: { sql: string }) {
  const normalized = await normalizeIdentifiersInSQL(o.sql);
  validateQuery(normalized);
  const jobConfig: any = { query: normalized, useLegacySql: false };
  if (BQ_LOCATION) jobConfig.location = BQ_LOCATION;
  const [job] = await bigquery.createQueryJob(jobConfig);
  const [rows] = await job.getQueryResults();
  return { rows, rowCount: rows.length, jobId: (job as any).id };
}

export const BigQueryTool = tool(
  async (o: unknown) => runSQL(SQLSchema.parse(o)),
  {
    name: "BigQueryTool",
    description:
      "Ejecuta una sentencia SQL arbitraria en BigQuery y devuelve las filas resultantes.",
    schema: SQLSchema,
  },
);

/**
 * QueryTool — typed aggregation over the canonical BQ table
 */
const QuerySchema = z.object({
  producto: z.string().optional(),
  marca: z.string().optional(),
  ano: z.number().int(),
  mes: z.number().int().min(1).max(12).optional(),
  cadena: z.string().optional(),
  estado: z.string().optional(),
  tienda: z.string().optional(),
  metric: z.enum(["botellas", "ventas"]),
  operacion: z.enum(["suma", "promedio", "conteo"]),
});

async function runQuery(input: z.infer<typeof QuerySchema>) {
  // Resolve actual column names from table schema (handles diacritics like AÑO)
  const { names } = await resolveColumns();
  const metricCol =
    input.metric === "ventas" ? `\`${names.venta}\`` : `\`${names.botellas}\``;
  let select = "";
  switch (input.operacion) {
    case "suma":
      select = `SUM(${metricCol}) AS resultado`;
      break;
    case "promedio":
      select = `AVG(${metricCol}) AS resultado`;
      break;
    case "conteo":
      select = `COUNT(1) AS resultado`;
      break;
  }

  const { projectId, dataset, table } = requireBQEnv();
  const fqn = `\`${projectId}.${dataset}.${table}\``;
  let sql = `SELECT ${select} FROM ${fqn}`;
  const where: string[] = [`\`${names.ano}\` = @ano`];
  const params: Record<string, unknown> = { ano: input.ano };

  if (input.mes) {
    where.push(`\`${names.mes}\` = @mes`);
    params.mes = input.mes;
  }
  if (input.producto) {
    where.push(`UPPER(\`${names.producto}\`) = @producto`);
    params.producto = input.producto.toUpperCase();
  }
  if (input.marca) {
    where.push(`UPPER(\`${names.marca}\`) = @marca`);
    params.marca = input.marca.toUpperCase();
  }
  if (input.cadena) {
    where.push(`UPPER(\`${names.cadena}\`) = @cadena`);
    params.cadena = input.cadena.toUpperCase();
  }
  if (input.estado) {
    where.push(`UPPER(\`${names.estado}\`) = @estado`);
    params.estado = input.estado.toUpperCase();
  }
  if (input.tienda) {
    where.push(`UPPER(\`${names.tienda}\`) = @tienda`);
    params.tienda = input.tienda.toUpperCase();
  }

  sql += " WHERE " + where.join(" AND ");
  const jobConfig: any = { query: sql, params, useLegacySql: false };
  if (BQ_LOCATION) jobConfig.location = BQ_LOCATION;
  const [job] = await bigquery.createQueryJob(jobConfig);
  const [rows] = await job.getQueryResults();
  return rows[0]?.resultado ?? 0;
}

export const QueryTool = tool(
  async (o: unknown) => {
    const input = QuerySchema.parse(o);
    return await runQuery(input);
  },
  {
    name: "QueryTool",
    description:
      "Ejecuta SUM, AVG o COUNT sobre la tabla canónica de BigQuery aplicando filtros básicos.",
    schema: QuerySchema,
  },
);

/**
 * Export an array of all available tools
 * Add new tools to this array to make them available to the agent
 *
 * Note: You can create custom tools by implementing the Tool interface from @langchain/core/tools
 * and add them to this array.
 * See https://js.langchain.com/docs/how_to/custom_tools/#tool-function for more information.
 */
const ENABLE_WEB_SEARCH =
  (process.env.ENABLE_WEB_SEARCH || "false").toLowerCase() === "true";
export const TOOLS = ENABLE_WEB_SEARCH
  ? [searchTavily, BigQueryTool, QueryTool]
  : [BigQueryTool, QueryTool];
