"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { SocketProvider, useSocket } from "@/context/SocketContext";

function AuthBridge() {
  const { data } = useSession();
  const { setIdentity, identity } = useSocket();

  useEffect(() => {
    if (!data?.user) return;
    setIdentity({
      username: identity.username || data.user.name || "",
      email: data.user.email || undefined,
      profilePic: data.user.image || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SocketProvider>
        <AuthBridge />
        {children}
      </SocketProvider>
    </SessionProvider>
  );
}
