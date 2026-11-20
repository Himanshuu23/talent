"use client";

import { useEffect, useMemo, useState } from "react";
import { ListOrdered, Radio, Search, Users } from "lucide-react";
import { useSocket } from "@/context/SocketContext";
import { CATEGORIES } from "@/lib/types";
import { ghostBtn, primaryBtn } from "@/lib/ui";

type JoinRole = "viewer" | "performer";

function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

/** Search box + list of rooms that are live right now. */
export default function LiveRooms({ onJoin }: { onJoin: (code: string, role: JoinRole) => void }) {
  const { rooms, listRooms, connected } = useSocket();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!connected) return;
    listRooms();
    const id = setInterval(listRooms, 8000);
    return () => clearInterval(id);
  }, [connected, listRooms]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return rooms;
    return rooms.filter((r) =>
      [r.roomName, r.roomCategory, categoryLabel(r.roomCategory), r.roomCode, r.host].some((v) =>
        (v || "").toLowerCase().includes(q)
      )
    );
  }, [rooms, q]);
  const typedCode = /^[a-z0-9]{4,8}$/.test(q) && !rooms.some((r) => r.roomCode === q);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#121214] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
          <Radio className="h-3.5 w-3.5" /> Live now
        </h2>
        <span className="text-xs text-zinc-500">{connected ? `${rooms.length} room${rooms.length === 1 ? "" : "s"}` : "connecting…"}</span>
      </div>

      <label className="relative block">
        <span className="sr-only">Search live rooms</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by room name, category or code"
          className="h-11 w-full rounded-lg border border-white/10 bg-black/40 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10"
        />
      </label>

      <ul className="mt-4 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
        {typedCode && (
          <li className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-amber-400/40 p-3">
            <p className="text-sm text-zinc-300">
              Join with code <span className="font-mono uppercase text-amber-300">{q}</span>
            </p>
            <button className={primaryBtn} onClick={() => onJoin(q, "viewer")}>
              Join
            </button>
          </li>
        )}
        {filtered.map((r) => (
          <li key={r.roomCode} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{r.roomName}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-400">
                  {categoryLabel(r.roomCategory)} · hosted by {r.host || "host"} ·{" "}
                  <span className="font-mono uppercase">{r.roomCode}</span>
                </p>
              </div>
              {r.livePerformer ? (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> On stage
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-400">Waiting</span>
              )}
            </div>
            {r.livePerformer && <p className="mt-2 text-sm text-zinc-300">Now performing: {r.livePerformer}</p>}
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {r.viewers} watching</span>
                <span className="flex items-center gap-1"><ListOrdered className="h-3.5 w-3.5" /> {r.queue} in queue</span>
              </p>
              <div className="flex gap-2">
                <button className={`${ghostBtn} !px-3.5 !py-1.5`} onClick={() => onJoin(r.roomCode, "performer")}>
                  Perform
                </button>
                <button className={`${primaryBtn} !px-3.5 !py-1.5`} onClick={() => onJoin(r.roomCode, "viewer")}>
                  Watch
                </button>
              </div>
            </div>
          </li>
        ))}
        {filtered.length === 0 && !typedCode && (
          <li className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-400">
            {rooms.length === 0
              ? "No rooms are live yet. Be the first — create a room and share the code."
              : "No rooms match that search."}
          </li>
        )}
      </ul>
    </div>
  );
}
