"use client";

import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export function WalletButton() {
  return (
    <WalletMultiButton className="!h-9 !rounded-full !border !border-white/10 !bg-white/5 !px-5 !text-sm !font-medium !text-white hover:!bg-white/10 transition-colors" />
  );
}
