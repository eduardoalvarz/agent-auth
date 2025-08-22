# Plan de Refactor para `apps/agents/src`

Este plan prioriza estabilizar la ejecución contra BigQuery, robustecer configuración/seguridad, y mejorar mantenibilidad y pruebas. Basado en la auditoría de:
- `bigqueryClient.ts`
- `tools.ts`
- `graph.ts`, `configuration.ts`, `utils.ts`, `prompts.ts`
- `security/auth.ts`, `security/supabase-client.ts`
- `tests/integration/graph.int.test.ts`

## 1) Hallazgos clave
- __[prompts.ts] Placeholders inconsistentes__: la plantilla usa `{time}` y `{user_info}`; en `graph.ts` se reemplaza `{system_time}` (no existe) y no se inyecta `user_info`. Resultado: variables sin resolver en sistema.
- __[tools.ts] Config duplicada de BigQuery__: FQN derivado en `tools.ts` (con default `coop-query`) y credenciales en `bigqueryClient.ts`. Riesgo de desalineación y entornos distintos.
- __[tools.ts] Riesgo de exfiltración de SQL__: `BigQueryTool` retorna `{ sql, rows }`. El prompt pide no exponer SQL. El LLM podría filtrar el campo `sql` al usuario.
- __[tools.ts] Falta de restricciones__: `BigQueryTool` permite SQL arbitrario (incluye DDL/DML). No hay validaciones de `SELECT` only, ni lista permitida de tablas.
- __[graph.ts] Razonamiento no aplicado__: `reasoningEffort` existe en `configuration.ts` pero no se pasa al modelo.
- __[auth.ts] Logging sensible__: se loggean todos los headers de la petición. Posible impresión de `Authorization: Bearer ...` en logs.
- __[security/supabase-client.ts] Singleton incompleto__: no reutiliza la instancia si ya existe; crea una nueva en cada llamada.
- __[prompts.ts] Catálogo estático__: lee `backend/unique_values.json` aunque la guía dice no depender de JSON estático. Falta un mecanismo dinámico.
- __[tests] Prueba no representativa__: `graph.int.test.ts` prueba "weather in SF" y no cubre casos de BigQuery ni herramientas propias.
- __[tools.ts] Mezcla de herramientas__: El agente incluye `TavilySearchResults`. El prompt exige consultas exclusivamente contra la tabla BQ; presencia de web search puede desviar al modelo.

## 2) Objetivos del refactor
- __Corrección inmediata de bugs__ (placeholders, seguridad en logs, singleton).
- __Configuración centralizada__ para BigQuery (project/dataset/table/location) y modelo (proveedor/opciones/razonamiento).
- __Aislamiento de herramientas__ y contratos tipados (inputs/outputs) evitando filtraciones.
- __Observabilidad y resiliencia__ (timeouts, retries, structured logs, jobId tracking).
- __Pruebas útiles__ unitarias y de integración enfocadas en BigQuery.

## 3) Diseño propuesto (estructura)
- `src/agent/`
  - `graph.ts` (solo orquestación LangGraph)
  - `prompts.ts` (plantillas puras + helper de render)
  - `configuration.ts` (schema + defaults + normalización)
- `src/data/bigquery/`
  - `client.ts` (cliente + opciones: projectId, location, credentials)
  - `config.ts` (dataset/table únicos)
  - `queryBuilder.ts` (helpers seguros, p.ej., SELECT-only)
  - `types.ts` (tipos de filas/columnas y enums de dominio)
- `src/tools/`
  - `bigqueryTool.ts` (SELECT-only, sin devolver SQL)
  - `queryTool.ts` (agregaciones tipadas y parámetros)
  - `index.ts` (lista de tools para este agente)
- `src/security/` (auth y supabase singleton)
- `src/tests/` (unitarios + integración)

## 4) Cambios P0 (críticos)
1. __Arreglar placeholders del sistema__
   - En `graph.ts`, reemplazar `{system_time}` por `{time}` y agregar inyección de `{user_info}` (mínimo como string vacío o datos básicos del usuario si hay contexto).
   - Añadir un pequeño renderer de plantilla para variables conocidas.
2. __No exponer SQL al LLM__
   - En `BigQueryTool`, retornar solo `{ rows }` y métricas internas (p.ej., `jobId`, `rowCount`), nunca la SQL.
3. __Restringir `BigQueryTool` a SELECT__
   - Validar que la consulta empiece por `SELECT` (ignorar whitespace/comments) y opcionalmente que haga referencia solo a `PROJECT.DATASET.TABLE` definidos.
   - Forzar `useLegacySql: false` y `location` configurable.
4. __Centralizar configuración de BQ__
   - Extraer FQN y dataset/table a `src/data/bigquery/config.ts`. Eliminar defaults mágicos (como `coop-query`). Fallar rápido si faltan envs críticos.
   - Unificar lectura de `projectId` entre `bigqueryClient.ts` y tools.
5. __Aplicar `reasoningEffort`__
   - En `graph.ts`, pasar `reasoningEffort` al init del modelo cuando el proveedor lo soporte. Mantener fallback silencioso si el proveedor lo ignora.
6. __Sanitizar logs de auth__
   - En `auth.ts`, no loggear el valor de `authorization`. Redactar `Authorization: <redacted>`.
7. __Reparar supabase singleton__
   - En `security/supabase-client.ts`, si `supabaseInstance` existe, retornarla; de lo contrario crearla.
8. __Gating de Tavily__
   - Excluir `TavilySearchResults` del agente de BQ por defecto o controlarlo por env `ENABLE_WEB_SEARCH=false`.

## 5) Cambios P1 (mejoras)
1. __Query Builder tipado__
   - `queryBuilder.ts` con construcción de `WHERE` por campos conocidos, mapeo de métrica (`ventas`→`VENTA`, `botellas`→`BOTELLAS`) y sanitización (UPPER/trim). Mantener API basada en parámetros nombrados.
2. __Herramienta de catálogo dinámico__
   - `UniqueValuesTool`: `SELECT DISTINCT` por columna (producto/marca/categoría/cadena/tienda/estado) con cache en memoria por 15–60 min. Usar en `prompts.ts` para reemplazar JSON estático cuando esté disponible.
3. __Observabilidad__
   - Logging estructurado (pino/console JSON): `queryId`, `jobId`, `durationMs`, `rowCount`, `fqn`.
   - Timeouts y reintentos exponiendo `maxRetries`, `timeoutMs` en config.
4. __Formateo de salida__
   - Helper para formato numérico/moneda (`MXN`) para tablas cuando el LLM no formatee correctamente (opt-in del tool o post-proc simple).
5. __Validación de configuración__
   - Zod para validar envs: `BQ_PROJECT_ID`, `BQ_DATASET`, `BQ_TABLE`, `BQ_LOCATION?`, credenciales GCP, `SUPABASE_URL/KEY`.

## 6) Cambios P2 (extensión)
- __Roles/perfiles de agente__: perfiles con distintos conjuntos de tools (solo BQ, BQ+web, etc.).
- __Capa DSL__: intenciones comunes (participación, distribución, mix de portafolio) traducidas a SQLs parametrizadas.
- __Cost & quota tracking__: contadores de uso por usuario/tenant.

## 7) Pruebas
- __Unitarias__
  - `queryBuilder` (construcción de WHERE, mapeo de métricas).
  - `BigQueryTool` validator (rechaza DDL/DML y tablas externas).
  - `security/supabase-client` (singleton) y `auth` (redaction).
- __Integración__
  - Happy path de `QueryTool` contra tabla canónica con dataset de prueba o mock (usar `@google-cloud/bigquery` stub/MSW o entorno etiquetado).
- __E2E ligero__
  - Flujo `graph.invoke` con mensaje que derive en uso de `QueryTool`.

## 8) Migración incremental (propuesta)
1. P0: placeholders + logs + singleton + no exponer SQL + SELECT-only + centralizar BQ config + razonamiento.
2. P1: query builder tipado + catálogo dinámico + observabilidad + validación de envs.
3. P2: roles, DSL, métricas de costo/uso.

## 9) Checklist de implementación
- [ ] Armonizar placeholders (`{time}`, `{user_info}`) y renderer en `graph.ts`/`prompts.ts`.
- [ ] Extraer `src/data/bigquery/config.ts` con FQN y validar envs.
- [ ] `BigQueryTool`: SELECT-only, sin `sql` en el output, `location` y `useLegacySql:false`.
- [ ] `QueryTool`: mover construcción a `queryBuilder.ts`, añadir tipos y tests.
- [ ] `auth.ts`: redacción de `Authorization` en logs.
- [ ] `security/supabase-client.ts`: verdadero singleton.
- [ ] `tools/index.ts`: remover Tavily o gate por env.
- [ ] Aplicar `reasoningEffort` en carga del modelo (`utils.ts`/`graph.ts`).
- [ ] Nuevas pruebas unitarias e integración relevantes a BQ.

## 10) Entorno y variables
- `BQ_PROJECT_ID` (obligatorio)
- `BQ_DATASET` (obligatorio)
- `BQ_TABLE` (obligatorio)
- `BQ_LOCATION` (opcional, recomendado)
- `GCP_CLIENT_EMAIL`, `GCP_PRIVATE_KEY` (o ADC via `GOOGLE_APPLICATION_CREDENTIALS`)
- `SUPABASE_URL`, `SUPABASE_KEY`
- `ENABLE_WEB_SEARCH=false` por defecto

## 11) Aceptación (criterios)
- No hay placeholders sin resolver en mensajes del sistema.
- Ninguna respuesta del agente expone SQL.
- `BigQueryTool` rechaza DDL/DML y consultas fuera del FQN configurado.
- Tests unitarios y de integración pasan en CI.
- Configuración de BQ centralizada y validada al arranque.
- Logs no exponen secretos y contienen `jobId` y `durationMs`.
