"use client";
import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import { useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (
        <div className="flex h-screen overflow-hidden">
            <div className="hidden bg-gray-900 md:flex md:w-64 md:flex-col">
                <Sidebar />
            </div>
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
                    <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-gray-900"> <Sidebar /> </div>
                </div>
            )}
            <div className="flex flex-1 flex-col">
                <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
                {children}
            </div>
        </div>
    );
}