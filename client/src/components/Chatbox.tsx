"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import Avatar from "./Avatar";

export default function ChatBox({
  sendMessage,
  messages,
}: {
  sendMessage: (message: string) => void;
  messages: ChatMessage[];
}) {
  const [message, setMessage] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    sendMessage(text);
    setMessage("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="px-4 pb-2 text-xs text-zinc-500">Backstage — only hosts and performers can see this chat.</p>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-zinc-500">No messages yet. Say hi to the crew.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 ${msg.isUser ? "flex-row-reverse" : ""}`}>
            {!msg.isUser && <Avatar name={msg.name} src={msg.profilePic} size={28} />}
            <div className={`max-w-[78%] ${msg.isUser ? "items-end text-right" : ""}`}>
              {!msg.isUser && (
                <p className="mb-0.5 px-1 text-[11px] text-zinc-500">
                  {msg.name} · {msg.role === "admin" ? "host" : msg.role}
                </p>
              )}
              <p
                className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm ${
                  msg.isUser ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md bg-zinc-800 text-zinc-100"
                }`}
              >
                {msg.text}
              </p>
              <p className="mt-0.5 px-1 text-[10px] text-zinc-600">{msg.time}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-white/10 p-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message the crew…"
          maxLength={500}
          className="h-10 flex-1 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-blue-500"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!message.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
