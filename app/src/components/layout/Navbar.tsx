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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="group inline-flex items-center gap-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-white">
            <Vote className="size-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-500">DAO PROTOCOL</p>
            <h1 className="text-sm font-semibold text-white transition group-hover:text-neutral-300">{APP_NAME}</h1>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-neutral-400 transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        <WalletMultiButton className="!h-9 !rounded-full !border !border-white/10 !bg-white/5 !px-5 !text-sm !font-medium !text-white hover:!bg-white/10 transition-colors" />
      </div>
    </header>
  );
}
