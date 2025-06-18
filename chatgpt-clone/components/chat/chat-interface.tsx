"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import {
  Send,
  Paperclip,
  ImageIcon,
  FileText,
  X,
  Edit3,
  Check,
  RotateCcw
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Message interface for chat state
 */
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

/**
 * ChatInterface component provides a full-featured chat UI with message history, file upload, editing, and streaming AI responses.
 */
export function ChatInterface() {
  // --- STATE MANAGEMENT ---
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ file: File; type: "image" | "document" }>
  >([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new message or loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Listen for chat changes and load messages for the selected chat
  useEffect(() => {
    const handleChatChanged = async (e: Event) => {
      const { detail: newChatId } = e as CustomEvent<string>;
      if (!newChatId) return;
      setChatId(newChatId);
      setMessages([]); // Clear current messages before loading new ones
      try {
        const res = await fetch(`/api/chat?chatId=${newChatId}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.messages)) {
          setMessages(data.messages);
        } else {
          console.error("Failed to load messages for chat:", data.error);
        }
      } catch (err) {
        console.error("Error fetching chat messages:", err);
      }
    };
    window.addEventListener("chatChanged", handleChatChanged);
    return () => window.removeEventListener("chatChanged", handleChatChanged);
  }, []);

  /**
   * Helper to send messages and stream AI response
   */
  const callChatApi = async (
    messageHistory: Message[],
    filesForUpload: Array<{ type: "image" | "document"; url: string }> = []
  ) => {
    setIsLoading(true);
    let currentChatId = chatId;
    let isNewChat = false;
    try {
      // Ensure a chat session exists
      if (!currentChatId) {
        isNewChat = true;
        const createRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create" }),
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.chat?.id) {
          throw new Error(createData.error || "Failed to create chat.");
        }
        currentChatId = createData.chat.id;
        setChatId(currentChatId);
      }
      // Add a placeholder for the assistant's response
      const assistantMessageId = `ai-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);
      // Send the message and stream the response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: currentChatId,
          messages: messageHistory,
          files: filesForUpload,
          action: "send",
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      if (!response.body) throw new Error("Response body is missing");
      // Stream the AI response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = "";
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line) continue;
          if (line.startsWith('0:')) {
            const jsonPayload = line.substring(2);
            try {
              const textChunk = JSON.parse(jsonPayload);
              streamedContent += textChunk;
            } catch (e) {
              console.error("Failed to parse stream chunk:", jsonPayload);
            }
          }
        }
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: streamedContent }
              : msg
          )
        );
      }
      if (isNewChat) {
        window.dispatchEvent(new CustomEvent("refreshChats"));
      }
    } catch (err) {
      console.error("API call error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Sorry, an error occurred. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle form submit: upload files, send user message, and call chat API
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() && uploadedFiles.length === 0) return;
    // Upload files first and get URLs
    const filesForUpload: Array<{ type: "image" | "document"; url: string }> = await Promise.all(
      uploadedFiles.map(async ({ file, type }) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
        const data = await res.json();
        return {
          type,
          url: data.url,
        };
      })
    );
    // Create a user message with plain text content
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      content: input.trim(),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setUploadedFiles([]);
    await callChatApi(newMessages, filesForUpload);
  };

  // --- EDIT & REGENERATE ---
  /**
   * Start editing a user message
   */
  const startEditing = (id: string, content: string) => {
    setEditingMessageId(id);
    setEditingContent(content);
  };
  /**
   * Cancel editing
   */
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };
  /**
   * Save edited message and regenerate response
   */
  const saveEdit = async () => {
    if (!editingMessageId) return;
    const messageIndex = messages.findIndex(m => m.id === editingMessageId);
    if (messageIndex === -1) return;
    const historyToResend = messages.slice(0, messageIndex);
    const updatedMessage = {
      ...messages[messageIndex],
      content: editingContent,
    };
    historyToResend.push(updatedMessage);
    setMessages(historyToResend);
    cancelEdit();
    await callChatApi(historyToResend);
  };
  /**
   * Regenerate the last assistant response
   */
  const regenerateResponse = async () => {
    const lastAiIndex = messages.findLastIndex(m => m.role === "assistant");
    if (lastAiIndex === -1) return;
    const historyToResend = messages.slice(0, lastAiIndex);
    setMessages(historyToResend);
    await callChatApi(historyToResend);
  };

  // --- FILE HANDLING ---
  /**
   * Handle file selection and add to upload list
   */
  const handleFileUpload = (files: FileList) => {
    const newFiles = Array.from(files).map(file => ({
      file,
      type: file.type.startsWith("image/") ? ("image" as const) : ("document" as const),
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };
  /**
   * Remove a file from upload list
   */
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };
  /**
   * Set quick input from suggestion
   */
  const setQuickInput = (text: string) => {
    setInput(text);
  };
  /**
   * Handle textarea input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <ScrollArea className="flex-1 px-4">
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <h1 className="text-4xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                How can I help you today?
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Start a conversation or upload files to get started
              </p>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {[
                  ["How do I learn React effectively?", "Learn React"],
                  ["What are JavaScript best practices?", "JavaScript Tips"],
                  ["Explain CSS Grid vs Flexbox", "CSS Layouts"],
                  ["How to deploy Next.js apps?", "Next.js Deployment"]
                ].map(([q, label]) => (
                  <Card
                    key={q}
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setQuickInput(q)}
                  >
                    <h3 className="font-medium mb-2">{label}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {q}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {/* Message list */}
          {messages.map(message => (
            <div
              key={message.id}
              className={cn(
                "flex gap-4 group message-enter",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-green-500 text-white text-xs">
                    AI
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[80%] space-y-2",
                  message.role === "user" ? "items-end" : "items-start"
                )}
              >
                {editingMessageId === message.id ? (
                  <div className="w-full space-y-2">
                    <Textarea
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveEdit}>
                        <Check className="h-4 w-4 mr-1" />
                        Save & Regenerate
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Card
                    className={cn(
                      "p-4 relative group/message",
                      message.role === "user"
                        ? "bg-blue-500 text-white ml-auto"
                        : "bg-gray-100 dark:bg-gray-800"
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                    {message.role === "user" && (
                      <div className="absolute -left-8 top-2 opacity-0 group-hover/message:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            startEditing(message.id, message.content)
                          }
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {message.role === "assistant" &&
                      !isLoading &&
                      message.content && (
                        <div className="absolute -right-8 top-2 opacity-0 group-hover/message:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={regenerateResponse}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                  </Card>
                )}
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                    U
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {/* Loading indicator for AI response */}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-4 message-enter">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-green-500 text-white text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
              <Card className="p-4 bg-gray-100 dark:bg-gray-800">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      {/* File upload and input area */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="max-w-3xl mx-auto">
          {uploadedFiles.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {uploadedFiles.map((fileObj, i) => (
                <div key={i} className="relative">
                  <Card className="p-2 flex items-center gap-2 bg-gray-50 dark:bg-gray-800">
                    {fileObj.type === "image" ? (
                      <ImageIcon className="h-4 w-4 text-blue-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm truncate max-w-[150px]">
                      {fileObj.file.name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeFile(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Card>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Message ChatGPT..."
                  className="min-h-[52px] max-h-[200px] resize-none pr-12 py-3"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                        ; (e.currentTarget.closest("form") as HTMLFormElement)?.requestSubmit()
                    }
                  }}
                />
                <div className="absolute right-2 bottom-2 flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={
                      isLoading || (!input.trim() && uploadedFiles.length === 0)
                    }
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={e =>
                e.target.files && handleFileUpload(e.target.files)
              }
            />
          </form>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            ChatGPT can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  )
}