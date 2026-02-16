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
        userAgent: "CCBot", // Common Crawl (AI training datasets)
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "PerplexityBot", // Perplexity AI
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "anthropic-ai", // Claude (Anthropic) training
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "ClaudeBot", // Claude real-time web search
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "Google-Extended", // Google AI (for training)
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "ChatGPT-User", // OpenAI real-time web browsing
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: "OAI-SearchBot", // OpenAI search citations
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

