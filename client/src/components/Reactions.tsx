"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dialogCls, inputCls, primaryBtn } from "@/lib/ui";

type OpenProps = { open: boolean; onOpenChange: (open: boolean) => void };

export function ScoreDialog({
  open,
  onOpenChange,
  mode,
  performerName,
  onSubmit,
}: OpenProps & { mode: "viewer" | "admin"; performerName?: string; onSubmit: (score: number) => void }) {
  const [score, setScore] = useState(8);
  useEffect(() => {
    if (open) setScore(8);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogCls}>
        <DialogHeader>
          <DialogTitle>{mode === "admin" ? "Judge score" : "Your vote"}{performerName ? ` · ${performerName}` : ""}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {mode === "admin"
              ? "Your score is combined with the audience average."
              : "Rate this performance from 1 to 10. You can vote again to change it."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setScore(n)}
              aria-pressed={score === n}
              className={`h-12 rounded-xl text-lg font-semibold transition ${
                score === n ? "bg-amber-400 text-zinc-950" : "bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          className={primaryBtn}
          onClick={() => {
            onSubmit(score);
            onOpenChange(false);
          }}
        >
          {mode === "admin" ? `Submit score ${score}` : `Vote ${score}/10`}
        </button>
      </DialogContent>
    </Dialog>
  );
}

const CHEERS = ["🔥 That was fire!", "👏 Bravo!", "❤️ Love it!", "🎉 Encore!"];

export function CheerDialog({ open, onOpenChange, onSubmit }: OpenProps & { onSubmit: (message: string) => void }) {
  const [text, setText] = useState(CHEERS[0]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogCls}>
        <DialogHeader>
          <DialogTitle>Cheer the performer</DialogTitle>
          <DialogDescription className="text-zinc-400">Your cheer pops up on stage for everyone.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {CHEERS.map((c) => (
            <button
              key={c}
              onClick={() => setText(c)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                text === c ? "border-pink-400 bg-pink-500/15" : "border-white/15 hover:bg-white/5"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} maxLength={140} />
        <button
          className="inline-flex items-center justify-center rounded-full bg-pink-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-400 disabled:opacity-50"
          disabled={!text.trim()}
          onClick={() => {
            onSubmit(text.trim());
            onOpenChange(false);
          }}
        >
          Send cheer
        </button>
      </DialogContent>
    </Dialog>
  );
}

const AMOUNTS = [1, 3, 5, 10, 20, 50];

export function TipDialog({
  open,
  onOpenChange,
  performerName,
  onSubmit,
}: OpenProps & { performerName?: string; onSubmit: (amount: number, message: string) => void }) {
  const [amount, setAmount] = useState("5");
  const [message, setMessage] = useState("");
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && value <= 10000;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogCls}>
        <DialogHeader>
          <DialogTitle>Tip {performerName || "the performer"}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Tips are recorded in the room and shown on stage. Demo mode: no real payment is processed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(String(a))}
              aria-pressed={Number(amount) === a}
              className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                Number(amount) === a ? "border-emerald-400 bg-emerald-500/15 text-emerald-200" : "border-white/15 hover:bg-white/5"
              }`}
            >
              ${a}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="1"
          step="0.01"
          className={inputCls}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Custom amount"
        />
        <input
          className={inputCls}
          placeholder="Add a message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={140}
        />
        <button
          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
          disabled={!valid}
          onClick={() => {
            onSubmit(value, message.trim());
            setMessage("");
            onOpenChange(false);
          }}
        >
          Send ${valid ? value.toFixed(2) : "0.00"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
