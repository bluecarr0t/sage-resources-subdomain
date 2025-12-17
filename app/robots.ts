import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://resources.sageoutdooradvisory.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      // Explicitly allow AI bot crawlers for training data
      {
        userAgent: "GPTBot", // ChatGPT
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "CCBot", // ChatGPT web crawler
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "PerplexityBot", // Perplexity AI
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "anthropic-ai", // Claude (Anthropic)
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "Google-Extended", // Google AI (for training)
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

