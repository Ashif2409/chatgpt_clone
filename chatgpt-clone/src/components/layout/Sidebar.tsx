"use client";
import { MessageSquare, Plus, Trash2, User } from "lucide-react";
import { mockChatHistory } from "@/lib/data";

export default function Sidebar() {
  return (
    <div className="flex h-full flex-col bg-[#212121] p-2 text-gray-300">
      <button className="mb-2 flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm hover:bg-gray-700">
        <Plus size={18} /> New chat
      </button>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 pr-2">
          {mockChatHistory.map((chat, index) => (
            <button key={index} className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm hover:bg-gray-700">
              <MessageSquare size={16} className="flex-shrink-0" />
              <span className="truncate">{chat}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-700 pt-2">
        <button className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm hover:bg-gray-700">
          <User size={18} /> Upgrade to Plus
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm hover:bg-gray-700">
          <Trash2 size={18} /> Clear conversations
        </button>
      </div>
    </div>
  );
}