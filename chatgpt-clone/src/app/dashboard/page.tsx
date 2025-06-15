"use client";
import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/chat/Message";
import ChatInput from "@/components/chat/ChatInput";
import { Message } from "@/lib/types";

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSendMessage = (content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsLoading(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "ai", content: `This is a simulated AI response.` }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex h-full flex-col bg-[#343541]">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold">ChatGPT Clone</h1>
              <p className="text-gray-400">Start a conversation below.</p>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((msg, index) => <ChatMessage key={index} {...msg} />)}
            {isLoading && <ChatMessage role="ai" content="Thinking..." />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="w-full border-t border-gray-700 bg-[#343541]">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        <p className="pb-3 text-center text-xs text-gray-400">
          Frontend prototype running on Tailwind CSS v3.
        </p>
      </div>
    </div>
  );
}