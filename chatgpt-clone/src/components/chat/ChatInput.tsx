"use client";
import { Paperclip, SendHorizonal } from "lucide-react";
import { useRef, useState, ChangeEvent, KeyboardEvent } from "react";

type ChatInputProps = { onSendMessage: (message: string) => void; isLoading: boolean; };

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
    const [inputValue, setInputValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };
    const handleSend = () => {
        if (inputValue.trim() && !isLoading) {
            onSendMessage(inputValue);
            setInputValue("");
            if (textareaRef.current) textareaRef.current.style.height = "auto";
        }
    };
    const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };
    const handleFileAttach = () => fileInputRef.current?.click();
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            alert(`File selected: ${file.name}. Upload functionality is a backend task.`);
        }
    };

    return (
        <div className="relative">
            <div className="mx-auto flex max-w-3xl items-end gap-2 p-4">
                <button onClick={handleFileAttach} className="rounded-lg p-2 hover:bg-gray-600"> <Paperclip size={20} /> </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <div className="relative flex-1">
                    <textarea ref={textareaRef} value={inputValue} onChange={handleInputChange} onKeyPress={handleKeyPress} rows={1} placeholder="Message ChatGPT..."
                        className="w-full resize-none rounded-lg border border-gray-600 bg-[#40414F] p-3 pr-12 text-gray-200 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        style={{ maxHeight: "200px" }} />
                    <button onClick={handleSend} disabled={!inputValue.trim() || isLoading} className="absolute bottom-2.5 right-2.5 rounded-lg bg-gray-600 p-2 text-gray-300 enabled:hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50">
                        <SendHorizonal size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}