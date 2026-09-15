import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://resources.sageoutdooradvisory.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz"],
      },
      // Explicitly allow AI bot crawlers for training data
      {
        userAgent: "GPTBot", // ChatGPT
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz"],
      },
      {
        userAgent: "CCBot", // Common Crawl (AI training datasets)
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz"],
      },
      {
        userAgent: "PerplexityBot", // Perplexity AI
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz"],
      },
      {
        userAgent: "anthropic-ai", // Claude (Anthropic) training
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz"],
      },
      {
        userAgent: "ClaudeBot", // Claude real-time web search
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz"],
      },
      {
        userAgent: "Google-Extended", // Google AI (for training)
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz"],
      },
      {
        userAgent: "ChatGPT-User", // OpenAI real-time web browsing
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz"],
      },
      {
        userAgent: "OAI-SearchBot", // OpenAI search citations
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

