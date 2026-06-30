import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/p",
      // Keep the admin dashboard and API out of search results.
      disallow: ["/", "/api/", "/listings", "/settings", "/conversations", "/bookings", "/whatsapp"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
