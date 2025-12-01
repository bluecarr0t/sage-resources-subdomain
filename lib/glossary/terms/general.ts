import type { GlossaryTerm } from "../types";

export const generalTerms: Record<string, GlossaryTerm> = {
    "seasonality": {
    slug: "seasonality",
    term: "Seasonality",
    definition: "The variation in demand, occupancy, and revenue for outdoor hospitality properties based on seasonal factors like weather, holidays, and tourism patterns.",
    extendedDefinition: `Seasonality refers to predictable patterns of demand variation throughout the year based on seasons, weather, holidays, and tourism cycles. For outdoor hospitality properties, seasonality significantly impacts occupancy rates, pricing, and revenue.

Many outdoor hospitality properties experience strong seasonality. For example, properties in mountain regions may have peak summer and winter seasons but slower spring and fall periods. Beach properties may peak in summer. Properties near national parks may follow park visitation patterns.

Understanding seasonality is critical for financial planning, staffing, marketing, and operations. Sage Outdoor Advisory includes detailed seasonality analysis in our feasibility studies, helping clients understand demand patterns and plan accordingly.`,
    category: "General",
    relatedTerms: ["occupancy-rate", "revenue-projections", "adr"],
    examples: [
      "A glamping resort with 90% occupancy in summer and 30% in winter",
      "An RV park near a national park following park visitation seasons"
    ],
    useCases: [
      "Financial planning",
      "Revenue forecasting",
      "Operations planning",
      "Marketing strategy"
    ],
    seoKeywords: ["seasonality", "seasonal demand", "seasonal patterns", "tourism seasonality"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "How does seasonality affect outdoor hospitality properties?",
        answer: "Seasonality causes significant variations in occupancy and revenue throughout the year, requiring careful financial planning and operations management."
      }
    ]
  },
    "outdoor-hospitality": {
    slug: "outdoor-hospitality",
    term: "Outdoor Hospitality",
    definition: "The industry segment encompassing accommodations and experiences in outdoor settings, including glamping resorts, RV parks, campgrounds, and outdoor resorts.",
    extendedDefinition: `Outdoor hospitality is the industry term for accommodations and hospitality experiences that take place in outdoor or natural settings. This includes glamping resorts, RV parks, campgrounds, outdoor resorts, and marinas - properties that combine hospitality services with outdoor recreation and nature experiences.

The outdoor hospitality industry has experienced significant growth as travelers seek unique, experiential accommodations that connect them with nature. This growth has been driven by trends toward experiential travel, interest in outdoor recreation, and the appeal of unique accommodation types.

Sage Outdoor Advisory specializes exclusively in outdoor hospitality, providing feasibility studies and appraisals for glamping resorts, RV parks, campgrounds, and related properties. Our deep industry expertise ensures accurate analysis and valuations for these unique property types. For a comprehensive assessment of current industry trends, challenges, and opportunities, see our <a href="https://sageoutdooradvisory.com/blog/2025-outdoor-hospitality-industry-overview/" class="text-[#006b5f] hover:text-[#005a4f] underline">2025 Outdoor Hospitality Industry Overview</a> blog post.`,
    category: "General",
    relatedTerms: ["glamping", "rv-resort", "campground", "feasibility-study"],
    examples: [
      "The outdoor hospitality industry includes glamping, RV parks, and campgrounds",
      "Outdoor hospitality properties combine nature experiences with hospitality services"
    ],
    useCases: [
      "Industry analysis",
      "Market research",
      "Investment analysis"
    ],
    seoKeywords: ["outdoor hospitality", "outdoor accommodations", "outdoor recreation hospitality"],
    internalLinks: [
      { text: "Our Services", url: "https://sageoutdooradvisory.com/our-services/" },
      { text: "About Sage", url: "https://sageoutdooradvisory.com/about/" },
      { text: "2025 Outdoor Hospitality Industry Overview", url: "https://sageoutdooradvisory.com/blog/2025-outdoor-hospitality-industry-overview/" }
    ],
    faqs: [
      {
        question: "What properties are included in outdoor hospitality?",
        answer: "Outdoor hospitality includes glamping resorts, RV parks, campgrounds, outdoor resorts, and marinas - properties that offer accommodations in outdoor settings."
      }
    ]
  },
};
