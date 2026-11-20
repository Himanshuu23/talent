import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers/Provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Talent.live — host a live talent show",
  description:
    "Create rooms, put performers on a live WebRTC stage, and let viewers vote, cheer, and donate in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-black text-white`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
