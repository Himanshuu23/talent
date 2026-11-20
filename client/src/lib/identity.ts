import type { Identity, SocialLinks } from "./types";

const KEY = "talent.identity";

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `user-${Math.random().toString(36).slice(2, 12)}`;
}

function randomSecret() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${randomId()}${randomId()}`.replace(/-/g, "");
}

export function loadIdentity(): Identity {
  if (typeof window === "undefined") {
    return { userId: "server", secret: "", username: "", socialLinks: {} };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Identity;
      if (parsed.userId) {
        const identity: Identity = {
          userId: parsed.userId,
          secret: parsed.secret || randomSecret(),
          username: parsed.username || "",
          email: parsed.email,
          profilePic: parsed.profilePic,
          socialLinks: parsed.socialLinks || {},
        };
        if (!parsed.secret) localStorage.setItem(KEY, JSON.stringify(identity));
        return identity;
      }
    }
  } catch {
    // ignore
  }
  const identity: Identity = { userId: randomId(), secret: randomSecret(), username: "", socialLinks: {} };
  localStorage.setItem(KEY, JSON.stringify(identity));
  return identity;
}

export function saveIdentity(patch: Partial<Identity>): Identity {
  const current = loadIdentity();
  const next: Identity = {
    ...current,
    ...patch,
    socialLinks: {
      ...current.socialLinks,
      ...(patch.socialLinks || {}),
    },
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function formatHandle(value?: string) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return value.replace(/^@/, "");
}

/** Only http(s) links are ever rendered as clickable. */
export function safeUrl(value?: string) {
  if (!value) return "";
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : "";
}

export function socialHref(network: keyof SocialLinks, value?: string) {
  if (network === "demo") return safeUrl(value);
  const handle = formatHandle(value);
  if (!handle) return "";
  if (/^https?:\/\//i.test(handle)) return handle;
  if (network === "instagram") return `https://instagram.com/${handle}`;
  if (network === "twitter") return `https://x.com/${handle}`;
  return `https://www.tiktok.com/@${handle}`;
}
