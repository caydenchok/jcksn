import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JCKSN - Property Listings",
  description: "Browse our latest property listings",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
