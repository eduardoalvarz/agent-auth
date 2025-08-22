/**
 * Define the configurable parameters for the agent.
 */
import { Annotation } from "@langchain/langgraph";
import { SYSTEM_PROMPT_TEMPLATE } from "./prompts.js";
import { RunnableConfig } from "@langchain/core/runnables";

export type ReasoningEffort = "low" | "medium" | "high";

function getReasoningEffortFromEnv(): ReasoningEffort {
  const v = (process.env.OPENAI_REASONING_EFFORT || "medium").toLowerCase();
  return (["low", "medium", "high"].includes(v) ? v : "medium") as ReasoningEffort;
}

export const ConfigurationSchema = Annotation.Root({
  /**
   * The system prompt to be used by the agent.
   */
  systemPromptTemplate: Annotation<string>,

  /**
   * The name of the language model to be used by the agent.
   * Use format "provider/model", e.g., "openai/o3" (default).
   */
  model: Annotation<string>,

  /**
   * Reasoning effort passed to reasoning-capable models like OpenAI o3.
   */
  reasoningEffort: Annotation<ReasoningEffort>,
});

export function ensureConfiguration(
  config: RunnableConfig,
): typeof ConfigurationSchema.State {
  /**
   * Ensure the defaults are populated.
   */
  const configurable = config.configurable ?? {};
  return {
    systemPromptTemplate:
      configurable.systemPromptTemplate ?? SYSTEM_PROMPT_TEMPLATE,
    model: configurable.model ?? "openai/o3",
    reasoningEffort: (configurable.reasoningEffort as ReasoningEffort) ?? getReasoningEffortFromEnv(),
  };
}
