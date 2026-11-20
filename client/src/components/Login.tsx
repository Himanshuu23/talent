"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function Login() {
  const { data: session } = useSession();

  if (session) {
    return (
      <button
        className="rounded-lg border border-white/10 bg-transparent px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/[0.06] hover:text-white"
        onClick={() => signOut()}
      >
        Logout
      </button>
    );
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_ENABLED) {
    return null;
  }

  return (
    <button
      className="rounded-lg bg-zinc-100 px-3.5 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
      onClick={() => signIn("google")}
    >
      Google login
    </button>
  );
}
