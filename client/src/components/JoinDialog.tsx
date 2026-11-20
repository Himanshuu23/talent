"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Mic } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSocket } from "@/context/SocketContext";
import { dialogCls, ghostBtn, inputCls, primaryBtn } from "@/lib/ui";

type JoinRole = "viewer" | "performer";

export default function JoinDialog({
  triggerClassName,
  label = "Join room",
  open: controlledOpen,
  onOpenChange,
  defaultCode = "",
  defaultRole = "viewer",
  hideTrigger = false,
}: {
  triggerClassName?: string;
  label?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultCode?: string;
  defaultRole?: JoinRole;
  hideTrigger?: boolean;
}) {
  const { joinRoom, identity, setIdentity, room, connected, error, clearError } = useSocket();
  const [internalOpen, setInternalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState(defaultCode);
  const [role, setRole] = useState<JoinRole>(defaultRole);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
    if (next) clearError();
  };

  // Keep the form in sync when a room card (or invite link) pre-fills it.
  useEffect(() => {
    if (defaultCode) setRoomCode(defaultCode);
  }, [defaultCode]);
  useEffect(() => {
    setRole(defaultRole);
  }, [defaultRole]);

  useEffect(() => {
    if (open && room?.roomCode) {
      setBusy(false);
      setOpen(false);
      router.push("/room");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, room, router]);

  useEffect(() => {
    if (error) setBusy(false);
  }, [error]);

  const roles: { value: JoinRole; title: string; copy: string; icon: JSX.Element }[] = [
    { value: "viewer", title: "Viewer", copy: "Watch, vote 1–10, cheer and tip", icon: <Eye className="h-4 w-4" /> },
    { value: "performer", title: "Performer", copy: "Camera on, join the queue, backstage chat", icon: <Mic className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger className={triggerClassName || ghostBtn}>{label}</DialogTrigger>
      )}
      <DialogContent className={dialogCls}>
        <DialogHeader>
          <DialogTitle className="text-xl">Join a live show</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter the 6-character room code from your host, or pick a live room from the home page.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="grid gap-1.5 text-sm text-zinc-300">
            Display name
            <input
              className={inputCls}
              value={identity.username}
              onChange={(e) => setIdentity({ username: e.target.value })}
              placeholder="How should we call you?"
              maxLength={40}
            />
          </label>
          <label className="grid gap-1.5 text-sm text-zinc-300">
            Room code
            <input
              className={`${inputCls} text-center font-mono text-lg uppercase tracking-[0.35em]`}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
              placeholder="ABC123"
              maxLength={8}
              autoComplete="off"
            />
          </label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Join as">
            {roles.map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={role === item.value}
                onClick={() => setRole(item.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  role === item.value
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-white/15 hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {item.icon} {item.title}
                </span>
                <span className="mt-1 block text-xs text-zinc-400">{item.copy}</span>
              </button>
            ))}
          </div>

          {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

          <button
            className={primaryBtn}
            disabled={!identity.username.trim() || roomCode.trim().length < 4 || !connected || busy}
            onClick={async () => {
              setBusy(true);
              await joinRoom({ roomCode, role });
              setBusy(false);
            }}
          >
            {!connected ? "Connecting…" : busy ? "Joining…" : role === "performer" ? "Join as performer" : "Join as viewer"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
