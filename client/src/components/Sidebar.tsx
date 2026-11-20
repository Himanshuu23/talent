"use client";

import { ReactNode, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Crown, ListOrdered, MessageSquare, Play, Trophy, Users, X } from "lucide-react";
import type { ChatMessage, PublicUser, RoomSnapshot, UserRole } from "@/lib/types";
import { formatMoney, overallScore } from "@/lib/score";
import Avatar from "./Avatar";
import ChatBox from "./Chatbox";
import SocialLinks from "./SocialLinks";

type Tab = "queue" | "people" | "chat" | "results";

/** A row that shows the person's socials + demo link on hover (or tap). */
function PersonRow({ person, children, sub }: { person: PublicUser; children?: ReactNode; sub?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [pinned, setPinned] = useState(false);

  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      top: Math.max(8, Math.min(rect.top, window.innerHeight - 260)),
      left: Math.max(8, rect.left - 296),
    });
  };

  return (
    <div
      ref={ref}
      className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 transition hover:bg-white/5"
      onMouseEnter={show}
      onMouseLeave={() => !pinned && setPos(null)}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => {
          if (pinned) {
            setPinned(false);
            setPos(null);
          } else {
            setPinned(true);
            show();
          }
        }}
      >
        <Avatar name={person.username} src={person.profilePic} size={36} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">{person.username}</span>
          <span className="block truncate text-xs text-zinc-500">{sub}</span>
        </span>
      </button>
      {children}
      {pos &&
        createPortal(
          <div
            style={{ top: pos.top, left: pos.left }}
            className="pointer-events-auto fixed z-[100] w-72 rounded-2xl border border-white/10 bg-zinc-900 p-4 text-white shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <Avatar name={person.username} src={person.profilePic} size={44} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{person.username}</p>
                <p className="text-xs capitalize text-zinc-400">{person.role === "admin" ? "host" : person.role}</p>
              </div>
            </div>
            <div className="mt-3 border-t border-white/10 pt-3">
              {person.socialLinks && Object.values(person.socialLinks).some(Boolean) ? (
                <SocialLinks links={person.socialLinks} />
              ) : (
                <p className="text-sm text-zinc-500">No socials or demo link added yet.</p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function Sidebar({
  room,
  users,
  userRole,
  myId,
  messages,
  sendChat,
  startPerformance,
  makeAdmin,
  onClose,
}: {
  room: RoomSnapshot;
  users: PublicUser[];
  userRole: UserRole;
  myId: string;
  messages: ChatMessage[];
  sendChat: (text: string) => void;
  startPerformance: (id?: string) => void;
  makeAdmin: (id: string) => void;
  onClose?: () => void;
}) {
  const canChat = userRole === "admin" || userRole === "performer";
  const [tab, setTab] = useState<Tab>("queue");
  const queue = room.queue || [];
  const current = room.currentPerformer;

  const tabs: { id: Tab; label: string; icon: ReactNode; count?: number }[] = [
    { id: "queue", label: "Queue", icon: <ListOrdered className="h-4 w-4" />, count: queue.length },
    { id: "people", label: "People", icon: <Users className="h-4 w-4" />, count: users.length },
    ...(canChat ? [{ id: "chat" as Tab, label: "Chat", icon: <MessageSquare className="h-4 w-4" />, count: undefined }] : []),
    { id: "results", label: "Results", icon: <Trophy className="h-4 w-4" />, count: undefined },
  ];
  const activeTab = tab === "chat" && !canChat ? "queue" : tab;

  const performers = users.filter((u) => u.role === "performer" || room.scores?.[u.userId]);
  const ranked = [...performers]
    .map((u) => ({ user: u, info: room.scores?.[u.userId] }))
    .sort((a, b) => (overallScore(b.info) ?? -1) - (overallScore(a.info) ?? -1));

  const group = (role: UserRole, title: string) => {
    const list = users.filter((u) => u.role === role);
    if (list.length === 0) return null;
    return (
      <div key={role} className="mb-4">
        <p className="mb-1 px-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
          {title} · {list.length}
        </p>
        {list.map((person) => (
          <PersonRow
            key={person.userId}
            person={person}
            sub={
              <>
                {person.userId === myId ? "You" : person.role === "admin" ? "Host" : person.role}
                {person.userId === current && " · on stage"}
              </>
            }
          >
            {userRole === "admin" && person.role !== "admin" && (
              <button
                onClick={() => {
                  if (window.confirm(`Make ${person.username} a host? They will be able to run the show.`)) makeAdmin(person.userId);
                }}
                className="flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10"
                title="Promote to host"
              >
                <Crown className="h-3 w-3" /> Make host
              </button>
            )}
          </PersonRow>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80">
      <div className="flex items-center justify-between gap-1 border-b border-white/10 p-2">
        <div role="tablist" className="flex flex-1 gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition ${
                activeTab === t.id ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {t.icon}
              {t.label}
              {typeof t.count === "number" && t.count > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] ${activeTab === t.id ? "bg-zinc-200" : "bg-white/10"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close panel" className="rounded-full p-2 hover:bg-white/10 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {activeTab === "queue" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {current && (
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2">
              <p className="px-2 pb-1 text-[11px] uppercase tracking-widest text-red-300">On stage now</p>
              {users.filter((u) => u.userId === current).map((p) => (
                <PersonRow key={p.userId} person={p} sub={p.userId === myId ? "You" : "Performing"} />
              ))}
            </div>
          )}
          <p className="mb-1 px-2 text-xs font-medium uppercase tracking-widest text-zinc-500">Up next</p>
          {queue.length === 0 && <p className="px-2 py-6 text-center text-sm text-zinc-500">Nobody is waiting. Performers can join the queue from their controls.</p>}
          {queue.map((id, index) => {
            const person = users.find((u) => u.userId === id);
            if (!person) return null;
            return (
              <PersonRow key={id} person={person} sub={`#${index + 1} in queue${id === myId ? " · you" : ""}`}>
                {userRole === "admin" && (
                  <button
                    onClick={() => startPerformance(id)}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-zinc-950 hover:bg-amber-300"
                  >
                    <Play className="h-3 w-3" /> Start
                  </button>
                )}
              </PersonRow>
            );
          })}
        </div>
      )}

      {activeTab === "people" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {group("admin", "Hosts")}
          {group("performer", "Performers")}
          {group("viewer", "Viewers")}
          <p className="px-2 text-xs text-zinc-600">Hover or tap someone to see their socials and demo link.</p>
        </div>
      )}

      {activeTab === "chat" && canChat && (
        <div className="flex min-h-0 flex-1 flex-col pt-3">
          <ChatBox sendMessage={sendChat} messages={messages} />
        </div>
      )}

      {activeTab === "results" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <p className="mb-3 px-2 text-xs text-zinc-500">
            Overall = average of audience votes and the host score (or whichever exists).
          </p>
          {ranked.length === 0 && <p className="px-2 py-6 text-center text-sm text-zinc-500">No performers yet.</p>}
          {ranked.map(({ user, info }, index) => {
            const overall = overallScore(info);
            return (
              <div key={user.userId} className="mb-2 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                <span className="w-5 text-center font-mono text-sm text-zinc-500">{index + 1}</span>
                <Avatar name={user.username} src={user.profilePic} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.username}</p>
                  <p className="text-xs text-zinc-500">
                    {info && info.viewerCount > 0 ? `${info.viewerAverage} from ${info.viewerCount} vote${info.viewerCount === 1 ? "" : "s"}` : "No votes"}
                    {info?.hasAdminScore ? ` · host ${info.adminScore}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-amber-300">{overall !== null ? overall.toFixed(1) : "—"}</p>
                  <p className="text-xs text-emerald-300">{formatMoney(info?.tips)}</p>
                </div>
              </div>
            );
          })}
          <p className="mt-3 px-2 text-right text-sm text-zinc-400">
            Room tips total <span className="font-semibold text-emerald-300">{formatMoney(room.totalDonations)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
