import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PromptSpec AI — Adversarial Prompt Compiler & Red-Team IDE",
  description:
    "Compile messy draft prompts into hardened production system specs, JSON schemas, and automated red-team A/B benchmarks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-[#07080d] text-zinc-100 antialiased selection:bg-violet-500/30 selection:text-violet-100">
        {/* Ambient Glow Background Orbs */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-[-15%] left-[18%] w-[520px] h-[520px] rounded-full bg-violet-600/20 blur-[130px]" />
          <div className="absolute bottom-[-12%] right-[14%] w-[460px] h-[460px] rounded-full bg-cyan-500/15 blur-[125px]" />
          <div className="absolute top-[40%] right-[35%] w-[320px] h-[320px] rounded-full bg-indigo-500/10 blur-[110px]" />
        </div>
        {children}
      </body>
    </html>
  );
}
