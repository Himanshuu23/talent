"use client";

import { useEffect, useState } from "react";
import { Video, Vote, Wallet } from "lucide-react";
import Navbar from "./Navbar";
import CreateDialog from "./CreateDialog";
import JoinDialog from "./JoinDialog";
import LiveRooms from "./LiveRooms";
import { useSocket } from "@/context/SocketContext";
import { ghostBtn, primaryBtn } from "@/lib/ui";

function Equalizer() {
  const bars = Array.from({ length: 80 });
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex h-32 items-end gap-[3px] px-1 opacity-70 [mask-image:linear-gradient(to_top,black,transparent)]"
    >
      {bars.map((_, i) => (
        <span
          key={i}
          className="eq-bar flex-1 rounded-t-full bg-gradient-to-t from-amber-400/80 to-rose-500/20"
          style={{
            height: `${35 + ((i * 37) % 65)}%`,
            animationDelay: `${(i % 13) * 0.11}s`,
            animationDuration: `${1.3 + ((i * 7) % 10) / 10}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function HeroSection() {
  const { error, clearError } = useSocket();
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinRole, setJoinRole] = useState<"viewer" | "performer">("viewer");

  // Invite links look like /?join=abc123
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("join");
    if (code) {
      setJoinCode(code.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8));
      setJoinOpen(true);
    }
  }, []);

  const openJoin = (code: string, role: "viewer" | "performer") => {
    setJoinCode(code);
    setJoinRole(role);
    setJoinOpen(true);
  };

  return (
    <div className="relative isolate overflow-hidden bg-zinc-950">
      {/* stage lighting */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(244,63,94,0.14),_transparent_45%)]" />
      <div className="spotlight absolute inset-x-0 top-0 -z-10 h-[34rem] opacity-80" />
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-[0.12] blur-sm"
        style={{ backgroundImage: 'url("/hero-bg.webp")' }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-zinc-950/60 to-zinc-950" />

      <Navbar />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
        <div className="text-white">
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Take the stage.{" "}
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-transparent">
              The crowd decides.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
            Host a live talent show with a performer queue, a timed stage and video. Your audience votes 1–10,
            cheers, and tips!
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CreateDialog triggerClassName={`${primaryBtn} !px-6 !py-3 text-base`} label="Create a room" />
            <JoinDialog
              triggerClassName={`${ghostBtn} !px-6 !py-3 text-base`}
              label="Join with a code"
              open={joinOpen}
              onOpenChange={setJoinOpen}
              defaultCode={joinCode}
              defaultRole={joinRole}
            />
          </div>

          {error && (
            <button
              onClick={clearError}
              className="mt-5 rounded-full bg-red-500/15 px-4 py-2 text-left text-sm text-red-200 hover:bg-red-500/25"
            >
              {error} <span className="ml-2 text-red-300/70">Dismiss</span>
            </button>
          )}
        </div>

        <div id="live" className="scroll-mt-24">
          <LiveRooms onJoin={openJoin} />
        </div>
      </div>

      <Equalizer />
    </div>
  );
}
