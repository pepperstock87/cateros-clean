import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/events/",
          "/proposals/",
          "/recipes/",
          "/settings/",
          "/billing/",
          "/onboarding/",
          "/p/",
          "/schedule/",
          "/staff/",
          "/inventory/",
          "/shopping/",
          "/prep/",
          "/spending/",
          "/rentals/",
          "/clients/",
          "/venues/",
          "/templates/",
          "/reports/",
          "/branding/",
          "/team/",
          "/notifications/",
          "/audit/",
          "/payouts/",
          "/cain/",
          "/assistant/",
          "/join/",
          "/vendor-profile/",
          "/check-email/",
        ],
      },
    ],
    sitemap: "https://cateros.com/sitemap.xml",
  };
}
