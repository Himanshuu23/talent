"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, DollarSign, Heart, Play, Star } from "lucide-react";
import type { CheerEvent, DonationEvent, PublicUser, ScoreInfo, UserRole } from "@/lib/types";
import { overallScore, formatMoney } from "@/lib/score";
import { useNow } from "@/hooks/useNow";
import Avatar from "./Avatar";
import SocialLinks from "./SocialLinks";

function Video({
  stream,
  muted,
  mirror,
  className = "",
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) {
      el.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    }
  }, [stream]);

  return (
    <>
      <video
        ref={ref}
        className={`${className} ${mirror ? "-scale-x-100" : ""}`}
        autoPlay
        playsInline
        muted={muted}
      />
      {blocked && (
        <button
          onClick={() => ref.current?.play().then(() => setBlocked(false)).catch(() => undefined)}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-sm font-medium text-white"
        >
          <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-zinc-950">
            <Play className="h-4 w-4" /> Tap to play
          </span>
        </button>
      )}
    </>
  );
}

export default function VideoGrid({
  localStream,
  remoteStreams,
  currentPerformer,
  users,
  userRole,
  userId,
  scores,
  timer,
  cheers,
  donations,
}: {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  currentPerformer: string | null;
  users: PublicUser[];
  userRole: UserRole;
  userId: string;
  scores?: ScoreInfo;
  timer: string;
  cheers: CheerEvent[];
  donations: DonationEvent[];
}) {
  const now = useNow(1000);
  const performer = users.find((user) => user.userId === currentPerformer);
  const iAmOnStage = currentPerformer === userId;
  const stageStream = iAmOnStage ? localStream : currentPerformer ? remoteStreams.get(currentPerformer) || null : null;
  const canSeeCrew = userRole === "admin" || userRole === "performer";
  const crew = users.filter(
    (user) => (user.role === "admin" || user.role === "performer") && user.userId !== currentPerformer && user.userId !== userId
  );
  const overall = overallScore(scores);
  const liveCheers = cheers.filter((c) => now - c.at < 9000).slice(0, 4);
  const liveTips = donations.filter((d) => now - d.at < 9000).slice(0, 3);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black">
        {stageStream ? (
          <Video stream={stageStream} muted={iAmOnStage} mirror={iAmOnStage} className="h-full w-full bg-black object-contain" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_rgba(251,191,36,0.10),_transparent_65%)] px-8 text-center">
            <div className="spotlight mb-6 h-16 w-40 opacity-80" />
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-amber-400">Stage</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              {currentPerformer ? "Connecting to the performer’s camera…" : "No one is on stage yet"}
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-400">
              {userRole === "admin"
                ? "Open the Queue tab and start the next performer when you’re ready."
                : userRole === "performer"
                  ? "Join the queue and wait for the host to call your name."
                  : "Voting, cheers and tips unlock the moment a performer goes live."}
            </p>
          </div>
        )}

        {performer && (
          <span className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
            {timer && <span className="font-mono normal-case tracking-normal">{timer}</span>}
          </span>
        )}

        {/* reactions floating over the stage */}
        <div className="pointer-events-none absolute bottom-24 left-4 z-20 flex max-w-[80%] flex-col gap-2">
          {liveTips.map((tip) => (
            <div key={tip.id} className="animate-pop flex items-center gap-2 rounded-2xl bg-emerald-500/90 px-3 py-2 text-sm font-medium text-white shadow-lg">
              <DollarSign className="h-4 w-4" />
              <span>
                {tip.fromUsername} tipped {formatMoney(tip.amount)}
                {tip.message ? ` — “${tip.message}”` : ""}
              </span>
            </div>
          ))}
          {liveCheers.map((cheer) => (
            <div key={cheer.id} className="animate-pop flex items-center gap-2 rounded-2xl bg-pink-500/90 px-3 py-2 text-sm text-white shadow-lg">
              <Heart className="h-4 w-4" />
              <span>
                <b>{cheer.viewerName}</b> {cheer.message}
              </span>
            </div>
          ))}
        </div>

        {performer && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-5 pb-4 pt-12">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={performer.username} src={performer.profilePic} size={44} />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-amber-300">Now performing</p>
                <p className="truncate text-lg font-semibold leading-tight">{performer.username}</p>
              </div>
              <SocialLinks links={performer.socialLinks} compact />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
                <Star className="h-4 w-4 text-amber-300" />
                {overall !== null ? overall.toFixed(1) : "—"}
                {scores && scores.viewerCount > 0 && <span className="text-xs text-zinc-400">({scores.viewerCount})</span>}
              </span>
              {scores?.hasAdminScore && (
                <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur" title="Host score">
                  <Crown className="h-4 w-4 text-amber-300" /> {scores.adminScore}
                </span>
              )}
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1.5 text-emerald-200 backdrop-blur">
                <DollarSign className="h-4 w-4" /> {formatMoney(scores?.tips).replace("$", "")}
              </span>
            </div>
          </div>
        )}
      </div>

      {canSeeCrew && (localStream || crew.length > 0) && (
        <div className="flex h-24 shrink-0 gap-3 overflow-x-auto sm:h-28">
          {localStream && !iAmOnStage && (
            <div className="relative aspect-video h-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
              <Video stream={localStream} muted mirror className="h-full w-full object-cover" />
              <p className="absolute bottom-1.5 left-2 rounded bg-black/60 px-1.5 text-xs">You</p>
            </div>
          )}
          {crew.map((person) => {
            const stream = remoteStreams.get(person.userId) || null;
            return (
              <div key={person.userId} className="relative aspect-video h-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                {stream ? (
                  <Video stream={stream} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Avatar name={person.username} src={person.profilePic} size={40} />
                  </div>
                )}
                <p className="absolute bottom-1.5 left-2 max-w-[90%] truncate rounded bg-black/60 px-1.5 text-xs">
                  {person.username} · {person.role === "admin" ? "host" : "performer"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
