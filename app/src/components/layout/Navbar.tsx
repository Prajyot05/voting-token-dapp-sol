"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Vote, Sparkles } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/proposals", label: "Proposals" },
  { href: "/voting", label: "Voting" },
  { href: "/admin", label: "Admin" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-cyan-400/20 bg-[#090b1fcc]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="group inline-flex items-center gap-2">
          <div className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 p-2 text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,.35)]">
            <Vote className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium tracking-[0.2em] text-cyan-200/80">DAO PROTOCOL</p>
            <h1 className="text-lg font-semibold text-white transition group-hover:text-cyan-300">{APP_NAME}</h1>
          </div>
          <Sparkles className="size-4 text-fuchsia-400" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-white/70 transition hover:text-cyan-300">
              {link.label}
            </Link>
          ))}
        </nav>

        <WalletMultiButton className="!h-10 !rounded-full !border !border-cyan-300/40 !bg-cyan-400/10 !px-4 !text-sm !text-cyan-100 !shadow-[0_0_20px_rgba(34,211,238,.2)] hover:!bg-cyan-400/20" />
      </div>
    </header>
  );
}
