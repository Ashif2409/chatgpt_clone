// Memory management for chat conversations
// This would integrate with mem0 or similar service in production

interface ChatMemory {
  chatId: string
  userId: string
  context: string[]
  entities: Record<string, any>
  summary: string
  lastUpdated: Date
}

class MemoryManager {
  private memories = new Map<string, ChatMemory>()

  async getMemory(chatId: string, userId: string): Promise<ChatMemory | null> {
    const key = `${userId}:${chatId}`
    return this.memories.get(key) || null
  }

  async updateMemory(chatId: string, userId: string, messages: any[]): Promise<void> {
    const key = `${userId}:${chatId}`
    const existing = this.memories.get(key)

    // Extract important information from messages
    const context = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .slice(-5) // Keep last 5 user messages as context

    // Simple entity extraction (in production, use NLP libraries)
    const entities = this.extractEntities(messages)

    // Generate summary for long conversations
    const summary = await this.generateSummary(messages)

    const memory: ChatMemory = {
      chatId,
      userId,
      context,
      entities: { ...existing?.entities, ...entities },
      summary,
      lastUpdated: new Date(),
    }

    this.memories.set(key, memory)
  }

  private extractEntities(messages: any[]): Record<string, any> {
    const entities: Record<string, any> = {}

    // Simple keyword extraction
    const text = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ")

    // Extract names (capitalized words)
    const names = text.match(/\b[A-Z][a-z]+\b/g) || []
    if (names.length > 0) {
      entities.names = [...new Set(names)]
    }

    // Extract dates
    const dates = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) || []
    if (dates.length > 0) {
      entities.dates = [...new Set(dates)]
    }

    return entities
  }

  private async generateSummary(messages: any[]): Promise<string> {
    if (messages.length < 10) return ""

    // In production, use AI to generate summaries
    const userMessages = messages
      .filter((m) => m.role === "user")
      .slice(0, 3)
      .map((m) => m.content)

    return `Conversation about: ${userMessages.join(", ")}`
  }

  async searchMemories(userId: string, query: string): Promise<ChatMemory[]> {
    const userMemories = Array.from(this.memories.values()).filter((m) => m.userId === userId)

    // Simple text search
    return userMemories.filter(
      (memory) =>
        memory.context.some((ctx) => ctx.toLowerCase().includes(query.toLowerCase())) ||
        memory.summary.toLowerCase().includes(query.toLowerCase()),
    )
  }

  async deleteMemory(chatId: string, userId: string): Promise<void> {
    const key = `${userId}:${chatId}`
    this.memories.delete(key)
  }
}

export const memoryManager = new MemoryManager()

// Helper function to enhance messages with memory context
export async function enhanceWithMemory(messages: any[], chatId: string, userId: string): Promise<any[]> {
  const memory = await memoryManager.getMemory(chatId, userId)

  if (!memory || memory.context.length === 0) {
    return messages
  }

  // Add memory context to system message
  const contextPrompt = `
Previous conversation context:
${memory.context.join("\n")}

Summary: ${memory.summary}

Entities mentioned: ${JSON.stringify(memory.entities)}

Please use this context to provide more personalized and coherent responses.
`

  const systemMessage = {
    role: "system",
    content: contextPrompt,
  }

  return [systemMessage, ...messages]
}
