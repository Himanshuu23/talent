"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function Login() {
  const { data: session } = useSession();

  if (session) {
    return (
      <button
        className="rounded-full bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
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
      className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200"
      onClick={() => signIn("google")}
    >
      Google login
    </button>
  );
}
