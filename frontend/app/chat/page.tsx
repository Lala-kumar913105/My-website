"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface ChatMessage {
  id: number;
  sender_id: number;
  recipient_id: number;
  message: string;
  created_at?: string | null;
}

export default function ChatPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [conversations, setConversations] = useState<ChatMessage[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");

  const fetchConversations = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const response = await fetch(`${API}/api/v1/social/chat`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const data: ChatMessage[] = await response.json();
      setConversations(data);
    }
  };

  const fetchMessages = async (userId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const response = await fetch(`${API}/api/v1/social/chat/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const data: ChatMessage[] = await response.json();
      setMessages(data);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeUserId) {
      fetchMessages(activeUserId);
      const interval = setInterval(() => fetchMessages(activeUserId), 5000);
      return () => clearInterval(interval);
    }
  }, [activeUserId]);

  const chatList = useMemo(() => {
    const map = new Map<number, ChatMessage>();
    conversations.forEach((message) => {
      const partnerId = message.sender_id === activeUserId ? message.recipient_id : message.sender_id;
      if (!map.has(partnerId)) {
        map.set(partnerId, message);
      }
    });
    return Array.from(map.entries());
  }, [conversations, activeUserId]);

  const handleSend = async () => {
    if (!activeUserId || !draft) return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const response = await fetch(`${API}/api/v1/social/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ recipient_id: activeUserId, message: draft }),
    });
    if (response.ok) {
      setDraft("");
      fetchMessages(activeUserId);
      fetchConversations();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Chats</h2>
          <div className="space-y-3">
            {chatList.map(([userId, message]) => (
              <button
                key={userId}
                onClick={() => setActiveUserId(userId)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                  activeUserId === userId ? "border-purple-500" : "border-gray-200"
                }`}
              >
                <p className="font-medium">User #{userId}</p>
                <p className="text-xs text-gray-500 truncate">{message.message}</p>
              </button>
            ))}
            {chatList.length === 0 && (
              <p className="text-sm text-gray-500">No chats yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <button
              onClick={() => router.push("/social-feed")}
              className="text-sm text-purple-600"
            >
              Back to Feed
            </button>
          </div>
          {activeUserId ? (
            <div className="space-y-3">
              <div className="h-80 overflow-y-auto space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${
                      message.sender_id === activeUserId
                        ? "bg-gray-100 text-gray-600"
                        : "bg-purple-600 text-white ml-auto"
                    }`}
                  >
                    {message.message}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm"
                  placeholder="Type a message"
                />
                <button
                  onClick={handleSend}
                  className="rounded-full bg-purple-600 px-4 py-2 text-sm text-white"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select a conversation to start chatting.</p>
          )}
        </div>
      </div>
    </div>
  );
}
