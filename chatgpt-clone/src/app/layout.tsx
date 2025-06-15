import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // This now imports our Tailwind v3 styles

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChatGPT Clone (Tailwind v3)",
  description: "A replica of ChatGPT built with Next.js and Tailwind CSS v3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}