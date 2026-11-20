"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
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
import Avatar from "./Avatar";
import InstagramLogo from "./logos/Instagram";
import XLogo from "./logos/X";
import TikTokLogo from "./logos/TikTok";

export default function ProfileDialog({
  triggerClassName,
  label = "Profile",
}: {
  triggerClassName?: string;
  label?: string;
}) {
  const { identity, setIdentity, updateProfile, room } = useSocket();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={triggerClassName || ghostBtn}>{label}</DialogTrigger>
      <DialogContent className={dialogCls}>
        <DialogHeader>
          <DialogTitle className="text-xl">Your performer profile</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Shown on stage while you perform, and when the host hovers over you in the queue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={identity.username} src={identity.profilePic} size={48} />
            <input
              className={inputCls}
              value={identity.username}
              onChange={(e) => setIdentity({ username: e.target.value })}
              placeholder="Display name"
              maxLength={40}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 shrink-0"><InstagramLogo /></span>
            <input
              className={inputCls}
              value={identity.socialLinks.instagram || ""}
              onChange={(e) => setIdentity({ socialLinks: { instagram: e.target.value } })}
              placeholder="Instagram handle"
              maxLength={100}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 shrink-0"><XLogo /></span>
            <input
              className={inputCls}
              value={identity.socialLinks.twitter || ""}
              onChange={(e) => setIdentity({ socialLinks: { twitter: e.target.value } })}
              placeholder="X / Twitter handle"
              maxLength={100}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 shrink-0"><TikTokLogo /></span>
            <input
              className={inputCls}
              value={identity.socialLinks.tiktok || ""}
              onChange={(e) => setIdentity({ socialLinks: { tiktok: e.target.value } })}
              placeholder="TikTok handle"
              maxLength={100}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex w-6 shrink-0 justify-center text-white"><Link2 className="h-5 w-5" /></span>
            <input
              className={inputCls}
              value={identity.socialLinks.demo || ""}
              onChange={(e) => setIdentity({ socialLinks: { demo: e.target.value } })}
              placeholder="Demo video link (https://…)"
              maxLength={300}
            />
          </div>
          <button
            className={primaryBtn}
            onClick={() => {
              if (room) updateProfile();
              setOpen(false);
            }}
          >
            Save profile
          </button>
          <p className="text-center text-xs text-zinc-500">Saved on this device. Only http(s) links are shown.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
