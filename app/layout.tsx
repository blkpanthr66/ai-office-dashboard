import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PinPoint Local AI — Office Dashboard",
  description: "AI Office Admin Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0d1117] text-slate-100">{children}</body>
    </html>
  );
}
