import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://himmer.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/agent/",
          "/admin/",
          "/vendor/",
          "/dashboard/",
          "/app/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/api/",
          "/agent/",
          "/admin/",
          "/vendor/",
          "/dashboard/",
          "/app/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
