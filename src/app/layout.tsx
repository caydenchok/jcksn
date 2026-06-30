import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BRAND, SITE_URL } from "@/lib/brand";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.company} — ${BRAND.region}`,
    template: `%s | ${BRAND.company}`,
  },
  description: BRAND.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-black text-white font-sans">
        {children}
      </body>
    </html>
  );
}
