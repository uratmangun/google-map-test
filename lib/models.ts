export type ProxyModel = {
  id?: string;
  owned_by?: string;
};

export type ProxyModelsResponse = {
  data?: ProxyModel[];
};

export type UiModel = {
  id: string;
  name: string;
  provider: string;
  providerLabel: string;
};

function toTitleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferProvider(modelId: string) {
  const normalized = modelId.toLowerCase();

  if (normalized.includes("gemini")) {
    return { provider: "google", providerLabel: "Google" };
  }

  if (normalized.includes("qwen")) {
    return { provider: "alibaba", providerLabel: "Alibaba" };
  }

  if (normalized.includes("claude")) {
    return { provider: "anthropic", providerLabel: "Anthropic" };
  }

  if (normalized.includes("llama")) {
    return { provider: "llama", providerLabel: "Llama" };
  }

  if (normalized.includes("mistral")) {
    return { provider: "mistral", providerLabel: "Mistral" };
  }

  if (normalized.includes("deepseek")) {
    return { provider: "deepseek", providerLabel: "DeepSeek" };
  }

  if (normalized.includes("grok")) {
    return { provider: "xai", providerLabel: "xAI" };
  }

  return { provider: "openai", providerLabel: "OpenAI-compatible" };
}

function humanizeModelName(modelId: string) {
  return (
    modelId
      .split(/[/:]/)
      .pop()
      ?.split("-")
      .map((part) => {
        if (/^\d+(?:\.\d+)?$/.test(part)) {
          return part;
        }

        if (part.length <= 3) {
          return part.toUpperCase();
        }

        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ") || modelId
  );
}

export function normalizeModel(model: ProxyModel): UiModel | null {
  const id = model.id?.trim();

  if (!id) {
    return null;
  }

  const owner = model.owned_by?.trim();
  const inferred = inferProvider(id);

  return {
    id,
    name: humanizeModelName(id),
    provider: inferred.provider,
    providerLabel: owner ? toTitleCase(owner) : inferred.providerLabel,
  };
}
