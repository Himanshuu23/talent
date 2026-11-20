"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  DollarSign,
  Gavel,
  Heart,
  Link2,
  ListPlus,
  LogOut,
  Mic,
  MicOff,
  PanelRight,
  Play,
  Square,
  Star,
  Video,
  VideoOff,
} from "lucide-react";
import VideoGrid from "./VideoGrid";
import Sidebar from "./Sidebar";
import Avatar from "./Avatar";
import { CheerDialog, ScoreDialog, TipDialog } from "./Reactions";
import { useSocket } from "@/context/SocketContext";
import { useNow } from "@/hooks/useNow";
import { formatMoney } from "@/lib/score";
import { CATEGORIES } from "@/lib/types";
import type { UserRole } from "@/lib/types";

function useCountdown(endsAt?: number) {
  const now = useNow(500);
  if (!endsAt) return { text: "", seconds: 0 };
  const total = Math.max(0, Math.ceil((endsAt * 1000 - now) / 1000));
  return { text: `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`, seconds: total };
}

function Btn({
  children,
  onClick,
  disabled,
  tone = "default",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "danger" | "pink" | "green";
  title?: string;
}) {
  const tones = {
    default: "border border-white/15 bg-white/5 text-white hover:bg-white/10",
    primary: "bg-gradient-to-r from-amber-400 to-orange-400 text-zinc-950 hover:brightness-110",
    danger: "border border-red-400/50 text-red-300 hover:bg-red-500/10",
    pink: "bg-pink-500 text-white hover:bg-pink-400",
    green: "bg-emerald-500 text-zinc-950 hover:bg-emerald-400",
  };
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export default function Room() {
  const router = useRouter();
  const {
    connected,
    identity,
    role,
    room,
    you,
    error,
    notice,
    messages,
    cheers,
    donations,
    localStream,
    remoteStreams,
    muted,
    videoOff,
    joinRoom,
    leaveRoom,
    closeRoom,
    sendChat,
    vote,
    cheer,
    donate,
    adminScore,
    joinQueue,
    leaveQueue,
    startPerformance,
    endPerformance,
    makeAdmin,
    toggleMute,
    toggleVideo,
    clearError,
    clearNotice,
  } = useSocket();

  const [panelOpen, setPanelOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [cheerOpen, setCheerOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  // Rejoin after a refresh; go home when there is nothing to rejoin.
  useEffect(() => {
    if (room || !connected) return;
    try {
      const raw = sessionStorage.getItem("talent.session");
      const session = raw ? (JSON.parse(raw) as { roomCode: string; role: UserRole }) : null;
      if (session?.roomCode) {
        void joinRoom({ roomCode: session.roomCode, role: session.role || "viewer" });
      } else {
        router.replace("/");
      }
    } catch {
      router.replace("/");
    }
  }, [connected, joinRoom, room, router]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(clearNotice, 4000);
    return () => clearTimeout(id);
  }, [notice, clearNotice]);

  // If the room is closed or we are removed, return to the home page.
  useEffect(() => {
    if (!room && !sessionStorage.getItem("talent.session") && connected) {
      router.replace("/");
    }
  }, [room, connected, router]);

  const countdown = useCountdown(room?.endsAt);

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-amber-400" />
        <p className="mt-5 text-sm text-zinc-300">{connected ? "Joining your room…" : "Connecting to the live server…"}</p>
        {error && <p className="mt-3 max-w-sm text-center text-sm text-red-400">{error}</p>}
        <button className="mt-6 text-sm text-zinc-400 underline" onClick={() => router.push("/")}>
          Back home
        </button>
      </div>
    );
  }

  const userRole: UserRole = role || you?.role || "viewer";
  const users = room.users || [];
  const queue = room.queue || [];
  const current = room.currentPerformer || "";
  const currentInfo = current ? room.scores?.[current] : undefined;
  const performerName = users.find((u) => u.userId === current)?.username;
  const inQueue = queue.includes(identity.userId);
  const queuePos = queue.indexOf(identity.userId) + 1;
  const imLive = current === identity.userId;
  const isCrew = userRole === "admin" || userRole === "performer";
  const viewerCount = users.filter((u) => u.role === "viewer").length;
  const categoryLabel = CATEGORIES.find((c) => c.value === room.roomCategory)?.label || room.roomCategory;

  const copy = async (what: "code" | "link") => {
    const text = what === "code" ? room.roomCode : `${window.location.origin}/?join=${room.roomCode}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Copy this:", text);
    }
  };

  const exit = () => {
    if (userRole === "admin") {
      if (!window.confirm("Close the room for everyone?")) return;
      closeRoom();
    } else {
      leaveRoom();
    }
    router.push("/");
  };

  const sidebar = (onClose?: () => void) => (
    <Sidebar
      room={room}
      users={users}
      userRole={userRole}
      myId={identity.userId}
      messages={messages}
      sendChat={sendChat}
      startPerformance={startPerformance}
      makeAdmin={makeAdmin}
      onClose={onClose}
    />
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-zinc-950 text-white">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-500">
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-300">{categoryLabel}</span>
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "animate-pulse bg-red-400"}`} title={connected ? "Connected" : "Reconnecting…"} />
            </p>
            <h1 className="truncate text-lg font-semibold leading-tight">{room.roomName}</h1>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => copy("code")}
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-mono text-xs uppercase hover:bg-white/10"
              title="Copy room code"
            >
              {copied === "code" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {room.roomCode}
            </button>
            <button
              onClick={() => copy("link")}
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10"
              title="Copy invite link"
            >
              {copied === "link" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Link2 className="h-3.5 w-3.5" />}
              Invite link
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-zinc-400 md:inline">{viewerCount} watching</span>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1.5 font-semibold text-emerald-300" title="Total tips in this room">
            <DollarSign className="h-4 w-4" />
            {formatMoney(room.totalDonations).replace("$", "")}
          </span>
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar name={identity.username} src={identity.profilePic} size={32} />
            <div className="leading-tight">
              <p className="max-w-[8rem] truncate text-sm font-medium">{identity.username}</p>
              <p className="text-xs capitalize text-zinc-500">{userRole === "admin" ? "host" : userRole}</p>
            </div>
          </div>
          <button
            onClick={() => setPanelOpen(true)}
            className="rounded-full border border-white/15 p-2.5 hover:bg-white/10 lg:hidden"
            aria-label="Open queue, people and chat"
          >
            <PanelRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      {(notice || error) && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4">
          {notice && <div className="animate-pop pointer-events-auto rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-950 shadow-xl">{notice}</div>}
          {error && (
            <button onClick={clearError} className="animate-pop pointer-events-auto rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-xl">
              {error} <span className="ml-2 opacity-70">✕</span>
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-4 p-3 sm:p-4">
        <main className="flex min-w-0 flex-1 flex-col gap-3">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            currentPerformer={current || null}
            users={users}
            userRole={userRole}
            userId={identity.userId}
            scores={currentInfo}
            timer={current ? countdown.text : ""}
            cheers={cheers}
            donations={donations}
          />

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {userRole === "viewer" && (
                <>
                  <Btn onClick={() => setScoreOpen(true)} disabled={!current} tone="primary"><Star className="h-4 w-4" /> Vote</Btn>
                  <Btn onClick={() => setCheerOpen(true)} disabled={!current} tone="pink"><Heart className="h-4 w-4" /> Cheer</Btn>
                  <Btn onClick={() => setTipOpen(true)} disabled={!current} tone="green"><DollarSign className="h-4 w-4" /> Tip</Btn>
                  {!current && <span className="text-xs text-zinc-500">Reactions unlock when someone is on stage.</span>}
                </>
              )}

              {userRole === "performer" && (
                <>
                  {imLive ? (
                    <>
                      <span className="rounded-full bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300">You’re live · {countdown.text}</span>
                      <Btn onClick={endPerformance} tone="danger"><Square className="h-4 w-4" /> End my set</Btn>
                    </>
                  ) : inQueue ? (
                    <>
                      <span className="rounded-full bg-amber-400/15 px-3 py-2 text-sm text-amber-200">You’re #{queuePos} in the queue</span>
                      <Btn onClick={leaveQueue}>Leave queue</Btn>
                    </>
                  ) : (
                    <Btn onClick={joinQueue} tone="primary"><ListPlus className="h-4 w-4" /> Join queue</Btn>
                  )}
                </>
              )}

              {userRole === "admin" && (
                <>
                  <Btn onClick={() => startPerformance()} disabled={queue.length === 0} tone="primary" title="Start the next performer in the queue">
                    <Play className="h-4 w-4" /> Start next{queue.length > 0 ? ` (${queue.length})` : ""}
                  </Btn>
                  {current && (
                    <>
                      <Btn onClick={() => setScoreOpen(true)}><Gavel className="h-4 w-4" /> Score</Btn>
                      <Btn onClick={endPerformance} tone="danger"><Square className="h-4 w-4" /> End act</Btn>
                    </>
                  )}
                </>
              )}

              {isCrew && (
                <>
                  <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className={`rounded-full border p-2.5 ${muted ? "border-red-400/60 bg-red-500/15 text-red-300" : "border-white/15 hover:bg-white/10"}`}>
                    {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button onClick={toggleVideo} aria-label={videoOff ? "Turn camera on" : "Turn camera off"} className={`rounded-full border p-2.5 ${videoOff ? "border-red-400/60 bg-red-500/15 text-red-300" : "border-white/15 hover:bg-white/10"}`}>
                    {videoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </button>
                </>
              )}
            </div>

            <Btn onClick={exit} tone="danger">
              <LogOut className="h-4 w-4" /> {userRole === "admin" ? "Close room" : "Leave"}
            </Btn>
          </div>
        </main>

        <aside className="hidden w-[22rem] shrink-0 lg:flex xl:w-[24rem]">{sidebar()}</aside>
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden" onClick={() => setPanelOpen(false)}>
          <div className="absolute inset-y-0 right-0 w-[min(26rem,100%)] p-2" onClick={(e) => e.stopPropagation()}>
            {sidebar(() => setPanelOpen(false))}
          </div>
        </div>
      )}

      <ScoreDialog
        open={scoreOpen}
        onOpenChange={setScoreOpen}
        mode={userRole === "admin" ? "admin" : "viewer"}
        performerName={performerName}
        onSubmit={(score) => (userRole === "admin" ? adminScore(score) : vote(score))}
      />
      <CheerDialog open={cheerOpen} onOpenChange={setCheerOpen} onSubmit={cheer} />
      <TipDialog open={tipOpen} onOpenChange={setTipOpen} performerName={performerName} onSubmit={donate} />
    </div>
  );
}
