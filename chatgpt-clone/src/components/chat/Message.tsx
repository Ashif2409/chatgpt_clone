import { Message } from "@/lib/types";
import { User, Bot } from "lucide-react";

export default function ChatMessage({ role, content }: Message) {
  const isAi = role === "ai";
  return (
    <div className={`whitespace-pre-wrap ${isAi ? "bg-[#444654]/60" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-3xl gap-4 px-4 py-6">
        <div className={`flex h-8 w-8 items-center justify-center rounded-sm ${isAi ? "bg-green-500" : "bg-blue-500"}`}>
          {isAi ? <Bot size={20} /> : <User size={20} />}
        </div>
        <div className="flex-1 pt-1">{content}</div>
      </div>
    </div>
  );
}