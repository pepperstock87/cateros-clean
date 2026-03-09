import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/events/", "/proposals/", "/recipes/", "/settings/", "/billing/", "/onboarding/", "/p/"],
      },
    ],
    sitemap: "https://cateros.com/sitemap.xml",
  };
}
