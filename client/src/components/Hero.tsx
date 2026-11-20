"use client";

import { useEffect, useState } from "react";
import { Video, Vote, Wallet } from "lucide-react";
import Navbar from "./Navbar";
import CreateDialog from "./CreateDialog";
import JoinDialog from "./JoinDialog";
import LiveRooms from "./LiveRooms";
import Showcase from "./Showcase";
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
          className="eq-bar flex-1 rounded-t-sm bg-gradient-to-t from-white/55 to-white/0"
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
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.06),_transparent_52%)]" />
      <div className="spotlight absolute inset-x-0 top-0 -z-10 h-[34rem] opacity-80" />
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-[0.12] blur-sm"
        style={{ backgroundImage: 'url("/hero-bg.webp")' }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-zinc-950/60 to-zinc-950" />

      <Navbar />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
        <div className="text-white">
          <p className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c5d1c0]" /> Real-time talent shows in your browser
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Take the stage.{" "}
            <span className="text-zinc-400">
              The crowd decides.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
            Host a live talent show with a performer queue, a timed stage and video. Your audience votes 1–10,
            cheers, and tips — all live, no installs.
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

          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 text-sm">
            {[
              { icon: <Video className="h-4 w-4" />, t: "Live video", d: "WebRTC stage for hosts & performers" },
              { icon: <Vote className="h-4 w-4" />, t: "Real votes", d: "1–10 audience score + host score" },
              { icon: <Wallet className="h-4 w-4" />, t: "Tips", d: "Audience tips per performer" },
            ].map((item) => (
              <div key={item.t}>
                <dt className="flex items-center gap-2 font-medium text-white">
                  <span className="text-zinc-400">{item.icon}</span> {item.t}
                </dt>
                <dd className="mt-1 text-xs leading-5 text-zinc-400">{item.d}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div id="live" className="scroll-mt-24">
          <LiveRooms onJoin={openJoin} />
        </div>
      </div>

      <Showcase />
      <Equalizer />
    </div>
  );
}
