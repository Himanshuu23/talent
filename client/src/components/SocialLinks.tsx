import { ExternalLink } from "lucide-react";
import type { SocialLinks as Links } from "@/lib/types";
import { socialHref, formatHandle } from "@/lib/identity";
import InstagramIcon from "./logos/Instagram";
import XIcon from "./logos/X";
import TikTokIcon from "./logos/TikTok";

/** Social handles + demo video link for a performer. Renders nothing if empty. */
export default function SocialLinks({ links, compact = false }: { links?: Links; compact?: boolean }) {
  if (!links) return null;
  const rows: { key: keyof Links; label: string; icon: JSX.Element; text: string }[] = [];
  if (links.instagram) rows.push({ key: "instagram", label: "Instagram", icon: <InstagramIcon />, text: `@${formatHandle(links.instagram).replace(/^https?:\/\/[^/]+\//, "")}` });
  if (links.twitter) rows.push({ key: "twitter", label: "X", icon: <XIcon />, text: `@${formatHandle(links.twitter).replace(/^https?:\/\/[^/]+\//, "")}` });
  if (links.tiktok) rows.push({ key: "tiktok", label: "TikTok", icon: <TikTokIcon />, text: `@${formatHandle(links.tiktok).replace(/^https?:\/\/[^/]+\/@?/, "")}` });
  if (links.demo && socialHref("demo", links.demo)) rows.push({ key: "demo", label: "Demo", icon: <ExternalLink className="h-5 w-5 text-white" />, text: "Watch demo video" });
  if (rows.length === 0) return null;

  return (
    <ul className={compact ? "flex flex-wrap gap-2" : "space-y-1.5"}>
      {rows.map((row) => (
        <li key={row.key}>
          <a
            href={socialHref(row.key, links[row.key])}
            target="_blank"
            rel="noreferrer noopener"
            className={
              compact
                ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 [&_svg]:h-4 [&_svg]:w-4"
                : "flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-zinc-200 hover:bg-white/10 [&_svg]:h-4 [&_svg]:w-4"
            }
            title={row.label}
          >
            {row.icon}
            {!compact && <span className="truncate">{row.text}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
