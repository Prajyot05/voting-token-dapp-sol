import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { SolanaProvider } from "@/components/providers/SolanaProvider";
import { Navbar } from "@/components/layout/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeonVote | Solana Governance",
  description: "Cyberpunk voting dApp powered by Solana and Anchor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#070a1d] text-white">
        <SolanaProvider>
          <div className="relative min-h-screen overflow-x-hidden">
            <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.2),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(217,70,239,0.22),transparent_40%),linear-gradient(160deg,#050610_0%,#0b1330_40%,#0d0c22_100%)]" />
            <div className="pointer-events-none fixed inset-0 -z-10 opacity-30 [background-image:linear-gradient(rgba(103,232,249,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.08)_1px,transparent_1px)] [background-size:40px_40px]" />
            <Navbar />
            <main className="mx-auto w-full max-w-7xl px-6 py-10">{children}</main>
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "rgba(8, 10, 30, 0.95)",
                  color: "#d9faff",
                  border: "1px solid rgba(34,211,238,0.35)",
                  boxShadow: "0 0 24px rgba(34,211,238,0.2)",
                },
              }}
            />
          </div>
        </SolanaProvider>
      </body>
    </html>
  );
}
