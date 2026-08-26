import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/admin", "/patients", "/analysis", "/ai", "/connect", "/profile"],
      },
    ],
    sitemap: (process.env.NEXT_PUBLIC_SITE_URL ?? "") + "/sitemap.xml",
  };
}
