import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://resources.sageoutdooradvisory.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz", "/client-portal"],
      },
      // Explicitly allow AI bot crawlers for training data
      {
        userAgent: "GPTBot", // ChatGPT
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz", "/client-portal"],
      },
      {
        userAgent: "CCBot", // Common Crawl (AI training datasets)
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz", "/client-portal"],
      },
      {
        userAgent: "PerplexityBot", // Perplexity AI
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz", "/client-portal"],
      },
      {
        userAgent: "anthropic-ai", // Claude (Anthropic) training
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz", "/client-portal"],
      },
      {
        userAgent: "ClaudeBot", // Claude real-time web search
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz", "/client-portal"],
      },
      {
        userAgent: "Google-Extended", // Google AI (for training)
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz", "/client-portal"],
      },
      {
        userAgent: "ChatGPT-User", // OpenAI real-time web browsing
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz", "/client-portal"],
      },
      {
        userAgent: "OAI-SearchBot", // OpenAI search citations
        allow: "/",
        disallow: ["/api/", "/admin/", "/login", "/auth/", "/glamping-show-quiz", "/client-portal"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

