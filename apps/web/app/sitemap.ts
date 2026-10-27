import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://himmer.vercel.app";
  const lastModified = new Date();

  return [
    { url: `${baseUrl}/support`, changeFrequency: "monthly", priority: 0.6 },
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/vendor/login`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
