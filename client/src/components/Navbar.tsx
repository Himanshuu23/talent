"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import Login from "./Login";
import Join from "./JoinDialog";
import Create from "./CreateDialog";
import ProfileDialog from "./ProfileDialog";
import { useSocket } from "@/context/SocketContext";
import { ghostBtn, primaryBtn } from "@/lib/ui";

const LINKS = [
  { href: "#live", label: "Live rooms" },
  { href: "#features", label: "Features" },
  { href: "#roles", label: "Roles" },
  { href: "#how-it-works", label: "How it works" },
];

export default function Navbar() {
  const { connected, room } = useSocket();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-30 mx-auto w-full max-w-7xl px-5 py-4 text-white sm:px-8">
      <nav className="flex items-center justify-between" aria-label="Main">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-sm font-semibold text-zinc-950">
            T
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Talent<span className="text-zinc-500">.live</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="rounded-full px-3.5 py-2 text-sm text-zinc-300 transition hover:text-white">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2.5 lg:flex">
          <span
            title={connected ? "Connected to the live server" : "Reconnecting to the live server…"}
            className={`h-2 w-2 rounded-full ${connected ? "bg-[#c5d1c0] shadow-[0_0_0_3px_rgba(197,209,192,0.2)]" : "animate-pulse bg-red-400"}`}
          />
          {room ? (
            <Link href="/room" className={primaryBtn}>
              Back to your room
            </Link>
          ) : (
            <>
              <ProfileDialog triggerClassName="rounded-full px-3.5 py-2 text-sm text-zinc-300 transition hover:text-white" />
              <Join triggerClassName={ghostBtn} label="Join" />
              <Create triggerClassName={primaryBtn} label="Create room" />
            </>
          )}
          <Login />
        </div>

        <button
          className="rounded-full p-2 hover:bg-white/10 lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-white/10 bg-[#101012]/95 p-4 lg:hidden">
          {room ? (
            <Link href="/room" className={primaryBtn}>
              Back to your room
            </Link>
          ) : (
            <>
              <Create triggerClassName={`${primaryBtn} w-full`} label="Create room" />
              <Join triggerClassName={`${ghostBtn} w-full`} label="Join with a code" />
              <ProfileDialog triggerClassName={`${ghostBtn} w-full`} label="My profile" />
            </>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pt-1 text-sm text-zinc-400">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="py-1 hover:text-white">
                {link.label}
              </a>
            ))}
          </div>
          <Login />
        </div>
      )}
    </header>
  );
}
