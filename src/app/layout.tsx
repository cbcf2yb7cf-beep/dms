import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "DMS", template: "%s · DMS" },
  description: "Predigten, Vorträge, Bibel und Präsentationen",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1d20" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const dark = (await cookies()).get("dms-theme")?.value === "dark";
  return (
    <html lang="de" className={`${inter.variable} ${serif.variable}${dark ? " dark" : ""}`}>
      <body>{children}</body>
    </html>
  );
}
