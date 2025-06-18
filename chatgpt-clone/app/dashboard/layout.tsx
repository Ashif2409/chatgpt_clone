"use client"

import type React from "react"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <ChatSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </SidebarProvider>
  )
}
