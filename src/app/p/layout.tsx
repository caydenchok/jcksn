import type { Metadata } from "next";
import { Cinzel, Josefin_Sans } from "next/font/google";
import { BRAND, SITE_URL } from "@/lib/brand";

const display = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Josefin_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const title = `${BRAND.company} | ${BRAND.agent} — Buy, Sell & Rent Property in ${BRAND.region}`;
const description = BRAND.description;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { absolute: title },
  description,
  applicationName: BRAND.company,
  authors: [{ name: BRAND.agent }],
  keywords: [
    "property Kota Kinabalu",
    "property Sabah",
    "rumah Sabah",
    "hartanah Kota Kinabalu",
    "real estate Kota Kinabalu",
    "buy property Sabah",
    "rent property Kota Kinabalu",
    "ZERO88 Property",
    "Jackson Liew",
    "REN 37532",
    "real estate negotiator Sabah",
    "condo Kota Kinabalu",
    "landed property Sabah",
  ],
  alternates: { canonical: "/p" },
  openGraph: {
    type: "website",
    siteName: BRAND.company,
    title,
    description,
    url: "/p",
    locale: "en_MY",
    // Image is provided automatically by app/p/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "real estate",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: BRAND.company,
  alternateName: BRAND.companyCn,
  description: BRAND.description,
  telephone: `+${BRAND.phone}`,
  email: BRAND.email,
  url: `${SITE_URL}/p`,
  areaServed: { "@type": "City", name: `${BRAND.city}, ${BRAND.state}` },
  address: {
    "@type": "PostalAddress",
    addressLocality: BRAND.city,
    addressRegion: BRAND.state,
    addressCountry: "MY",
  },
  sameAs: [BRAND.facebook],
  knowsLanguage: ["en", "ms", "zh"],
  employee: {
    "@type": "Person",
    name: BRAND.agent,
    jobTitle: BRAND.jobTitle,
    identifier: BRAND.ren,
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${display.variable} ${body.variable} bg-[#FAF7F0]`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
