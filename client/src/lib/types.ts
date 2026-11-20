export type UserRole = "admin" | "performer" | "viewer";

export type SocialLinks = {
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  /** Link to a demo / highlight video (http or https). */
  demo?: string;
};

export type PublicUser = {
  userId: string;
  username: string;
  email?: string;
  profilePic?: string;
  role: UserRole;
  isPerforming?: boolean;
  socialLinks?: SocialLinks;
  hasMedia?: boolean;
};

export type ScoreInfo = {
  viewerAverage: number;
  viewerCount: number;
  adminScore: number;
  hasAdminScore: boolean;
  /** Total tips (in dollars) this performer received in the room. */
  tips: number;
};

export type RoomSummary = {
  roomCode: string;
  roomName: string;
  roomCategory: string;
  host: string;
  performers: number;
  viewers: number;
  queue: number;
  livePerformer: string;
  createdAt: number;
};

export type RoomSnapshot = {
  roomCode: string;
  roomName: string;
  roomCategory: string;
  createdAt: number;
  performerDuration: number;
  currentPerformer: string;
  endsAt: number;
  queue: string[];
  users: PublicUser[];
  scores: Record<string, ScoreInfo>;
  totalDonations: number;
  adminId: string;
};

export type ChatMessage = {
  id: string;
  name: string;
  userId: string;
  time: string;
  text: string;
  isUser?: boolean;
  role?: UserRole;
  profilePic?: string;
};

export type CheerEvent = {
  id: string;
  viewerName: string;
  message: string;
  at: number;
};

export type DonationEvent = {
  id: string;
  fromUsername: string;
  amount: number;
  message?: string;
  at: number;
};

export type Identity = {
  userId: string;
  /** Random secret that proves this browser owns `userId` (never shown to others). */
  secret: string;
  username: string;
  email?: string;
  profilePic?: string;
  socialLinks: SocialLinks;
};

export const CATEGORIES = [
  { value: "variety", label: "Variety" },
  { value: "singing", label: "Singing" },
  { value: "dance", label: "Dance" },
  { value: "music", label: "Music" },
  { value: "comedy", label: "Comedy" },
  { value: "art", label: "Art" },
] as const;
