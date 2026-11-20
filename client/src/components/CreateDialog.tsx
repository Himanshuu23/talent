"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSocket } from "@/context/SocketContext";
import { CATEGORIES } from "@/lib/types";
import { dialogCls, ghostBtn, inputCls, primaryBtn } from "@/lib/ui";

const DURATIONS = [
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
  { label: "15 min", value: 900 },
];

export default function CreateDialog({
  triggerClassName,
  label = "Create room",
}: {
  triggerClassName?: string;
  label?: string;
}) {
  const { createRoom, identity, setIdentity, room, connected, error, clearError } = useSocket();
  const [open, setOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomCategory, setRoomCategory] = useState("variety");
  const [performerDuration, setPerformerDuration] = useState(180);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open && room?.roomCode) {
      setBusy(false);
      setOpen(false);
      router.push("/room");
    }
  }, [open, room, router]);

  useEffect(() => {
    if (error) setBusy(false);
  }, [error]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) clearError();
      }}
    >
      <DialogTrigger className={triggerClassName || primaryBtn}>{label}</DialogTrigger>
      <DialogContent className={dialogCls}>
        <DialogHeader>
          <DialogTitle className="text-xl">Host a talent show</DialogTitle>
          <DialogDescription className="text-zinc-400">
            You become the host: you run the queue, start each act, and score performances.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <label className="grid gap-1.5 text-sm text-zinc-300">
            Your host name
            <input
              className={inputCls}
              value={identity.username}
              onChange={(e) => setIdentity({ username: e.target.value })}
              placeholder="e.g. Priya"
              maxLength={40}
            />
          </label>

          <label className="grid gap-1.5 text-sm text-zinc-300">
            Room name <span className="-mt-1 text-xs text-zinc-500">Optional — we will pick a fun one</span>
            <input
              className={inputCls}
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Friday Open Mic"
              maxLength={60}
            />
          </label>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm text-zinc-300">Category</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  type="button"
                  key={category.value}
                  onClick={() => setRoomCategory(category.value)}
                  aria-pressed={roomCategory === category.value}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                    roomCategory === category.value
                      ? "border-amber-400 bg-amber-400/15 text-amber-200"
                      : "border-white/15 text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm text-zinc-300">Time per performer</legend>
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map((d) => (
                <button
                  type="button"
                  key={d.value}
                  onClick={() => setPerformerDuration(d.value)}
                  aria-pressed={performerDuration === d.value}
                  className={`rounded-xl border py-2 text-sm transition ${
                    performerDuration === d.value
                      ? "border-amber-400 bg-amber-400/15 text-amber-200"
                      : "border-white/15 text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">Performers are taken off stage automatically when time is up.</p>
          </fieldset>

          <p className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-zinc-400">
            <Camera className="h-4 w-4 shrink-0 text-amber-300" />
            Your browser will ask for camera and microphone access — hosts appear on video.
          </p>

          {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

          <div className="flex gap-3">
            <button
              className={`${primaryBtn} flex-1`}
              disabled={!identity.username.trim() || !connected || busy}
              onClick={async () => {
                setBusy(true);
                await createRoom({ roomName: roomName.trim(), roomCategory, performerDuration });
                setBusy(false);
              }}
            >
              {!connected ? "Connecting…" : busy ? "Creating…" : "Create and go live"}
            </button>
            <button className={ghostBtn} onClick={() => setOpen(false)} type="button">
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
