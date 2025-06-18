// Model context sizes
const MODEL_TOKEN_LIMITS: Record<string, number> = {
  "gpt-4o": 4096
};


function getModelContextLimit(model: string) {
  // Default to 4096 if unknown
  return MODEL_TOKEN_LIMITS[model] ?? 4096;
}

// Estimate tokens in a message array
// tiktoken.encode() expects a string. Needs a flattening helper for chat formats.
function messageToString(msg: any): string {
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg.content)) {
    // Handle image / file messages
    return msg.content.map((c: any) => c.type === "image_url" ? "[image]" : c.text || "").join(" ");
  }
  return msg.content ?? "";
}
function estimateMessagesTokenCount(messages: any[], encoder: any): number {
  // OpenAI: Each message = 4 tokens overhead; each name = -1 (see OpenAI tiktoken docs)
  // Here we ignore minor variations for simplicity
  let tokens = 0;
  for (const m of messages) {
    tokens += 4; // per message overhead
    tokens += encoder.encode(messageToString(m)).length;
  }
  tokens += 2; // priming
  return tokens;
}

export function trimMessagesToFitTokenLimit(messages: any[], encoder: any, model: string, reservedReplyTokens = 1024) {
  const tokenLimit = getModelContextLimit(model) - reservedReplyTokens;
  let result = [...messages];
  while (estimateMessagesTokenCount(result, encoder) > tokenLimit && result.length > 1) {
    result.shift(); // Remove messages from the start (oldest) until fit
  }
  return result;
}