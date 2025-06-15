import { Menu } from "lucide-react";

type MobileHeaderProps = { onMenuClick: () => void };

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
    return (
        <div className="flex items-center justify-between border-b border-gray-700 bg-[#343541] p-4 md:hidden">
            <button onClick={onMenuClick} className="p-2"> <Menu size={24} /> </button>
            <h1 className="text-lg font-semibold">Current Chat</h1>
            <div className="w-10"></div>
        </div>
    );
}