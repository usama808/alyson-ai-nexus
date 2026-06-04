import { env } from "./env.js";

export type AiProviderId = "openai" | "anthropic" | "deepseek" | "mock";

export function isProviderConfigured(provider: Exclude<AiProviderId, "mock">): boolean {
  switch (provider) {
    case "openai":
      return Boolean(env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(env.ANTHROPIC_API_KEY);
    case "deepseek":
      return Boolean(env.DEEPSEEK_API_KEY);
    default:
      return false;
  }
}

export function getConfiguredProviders(): Exclude<AiProviderId, "mock">[] {
  const list: Exclude<AiProviderId, "mock">[] = [];
  if (isProviderConfigured("openai")) list.push("openai");
  if (isProviderConfigured("anthropic")) list.push("anthropic");
  if (isProviderConfigured("deepseek")) list.push("deepseek");
  return list;
}

export function getAiStatus() {
  const configured = getConfiguredProviders();
  const primary = env.MOCK_AI ? "mock" : (configured[0] ?? null);

  return {
    mock: env.MOCK_AI,
    primaryProvider: primary,
    configuredProviders: configured,
    models: {
      openai: env.OPENAI_MODEL,
      anthropic: "claude-3-5-sonnet-20241022",
      deepseek: "deepseek-chat",
      mock: "mock-local",
    },
    ingestionAiEnabled: !env.MOCK_AI && configured.length > 0,
  };
}
