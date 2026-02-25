import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://resources.sageoutdooradvisory.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/"],
      },
      // Explicitly allow AI bot crawlers for training data
      {
        userAgent: "GPTBot", // ChatGPT
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/"],
      },
      {
        userAgent: "CCBot", // Common Crawl (AI training datasets)
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/"],
      },
      {
        userAgent: "PerplexityBot", // Perplexity AI
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/"],
      },
      {
        userAgent: "anthropic-ai", // Claude (Anthropic) training
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/"],
      },
      {
        userAgent: "ClaudeBot", // Claude real-time web search
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/"],
      },
      {
        userAgent: "Google-Extended", // Google AI (for training)
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/"],
      },
      {
        userAgent: "ChatGPT-User", // OpenAI real-time web browsing
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/"],
      },
      {
        userAgent: "OAI-SearchBot", // OpenAI search citations
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

