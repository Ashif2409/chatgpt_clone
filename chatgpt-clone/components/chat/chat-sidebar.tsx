"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  MessageSquare,
  Plus,
  Settings,
  LogOut,
  Trash2,
  Edit3,
  Menu,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Chat {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export function ChatSidebar() {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const { setOpenMobile } = useSidebar()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchChats()
  }, [])

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chat?action=list")
      const data = await res.json()
      if (res.ok) {
        const sorted = data.chats.sort(
          (a: Chat, b: Chat) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        setChats(sorted)
        if (sorted.length > 0) {
          setActiveChat(sorted[0].id)
          window.dispatchEvent(
            new CustomEvent("chatChanged", { detail: sorted[0].id })
          )
        }
      } else {
        throw new Error(data.error || "Failed to load chats")
      }
    } catch (err) {
      toast({
        title: "Error loading chats",
        description: String(err),
        variant: "destructive",
      })
    }
  }

  const createNewChat = async () => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ action: "create" }),
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (res.ok) {
        const newChat: Chat = data.chat
        setChats((prev) => [newChat, ...prev])
        setActiveChat(newChat.id)
        fetchChats()
        window.dispatchEvent(new CustomEvent("chatChanged", { detail: newChat.id }))
        toast({ title: "New chat created", description: "Start a new conversation" })
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" })
    }
  }

  const deleteChat = async (chatId: string) => {
    try {
      const res = await fetch("/api/chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      setChats((prev) => prev.filter((chat) => chat.id !== chatId))
      if (activeChat === chatId) {
        const remaining = chats.filter((c) => c.id !== chatId)
        const nextActive = remaining.length ? remaining[0].id : null
        setActiveChat(nextActive)
        window.dispatchEvent(new CustomEvent("chatChanged", { detail: nextActive }))
      }
      toast({ title: "Chat deleted", description: "The conversation has been removed" })
    } catch (err) {
      toast({ title: "Delete failed", description: String(err), variant: "destructive" })
    }
  }

  const updateChatTitle = async (chatId: string, newTitle: string) => {
    if (!newTitle.trim()) return
    try {
      const res = await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, title: newTitle.trim() }),
      })
      if (!res.ok) throw new Error("Failed to update title")

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, title: newTitle.trim() } : chat
        )
      )
      setEditingChatId(null)
      toast({ title: "Chat renamed", description: "Title updated successfully" })
    } catch (err) {
      toast({ title: "Update failed", description: String(err), variant: "destructive" })
    }
  }

  const selectChat = (chatId: string) => {
    setActiveChat(chatId)
    window.dispatchEvent(new CustomEvent("chatChanged", { detail: chatId }))
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 border rounded-full shadow"
        onClick={() => setOpenMobile(true)}
        aria-label="Open sidebar"
        type="button"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar wrapper */}
      <Sidebar className="h-full border-r border-gray-200 dark:border-gray-800">
        <SidebarHeader className="p-4 flex items-center justify-between">
          <Button
            onClick={createNewChat}
            className="w-full justify-start gap-2 bg-transparent border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <div
                      onClick={() => selectChat(chat.id)}
                      className={`group relative w-full cursor-pointer justify-start gap-2 px-3 py-2 text-sm flex items-center rounded-md hover:bg-muted ${
                        activeChat === chat.id ? "bg-muted font-medium" : ""
                      }`}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      {editingChatId === chat.id ? (
                        <input
                          type="text"
                          className="truncate flex-1 text-left text-sm px-1 py-0.5 border rounded bg-white dark:bg-gray-900"
                          defaultValue={chat.title}
                          onBlur={(e) => updateChatTitle(chat.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur()
                            else if (e.key === "Escape") setEditingChatId(null)
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="truncate flex-1 text-left">{chat.title}</span>
                      )}
                      <div
                        className="opacity-0 group-hover:opacity-100 flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => setEditingChatId(chat.id)}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          onClick={() => deleteChat(chat.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-gray-200 dark:border-gray-800">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="w-full justify-start gap-2"
                onClick={() =>
                  toast({
                    title: "Settings",
                    description: "Settings panel coming soon!",
                  })
                }
              >
                <Settings className="h-4 w-4" />
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                <LogOut className="h-4 w-4" />
                Log out
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  )
}
