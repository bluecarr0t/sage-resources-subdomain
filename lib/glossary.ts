export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string; // Short definition for featured snippet
  extendedDefinition: string; // Detailed explanation (300-500 words)
  category: "Feasibility & Appraisal" | "Glamping" | "RV & Campground" | "Financial" | "Real Estate" | "General";
  relatedTerms: string[]; // Slugs of related terms
  examples?: string[];
  useCases?: string[];
  seoKeywords: string[];
  internalLinks?: {
    text: string;
    url: string;
  }[];
  faqs?: {
    question: string;
    answer: string;
  }[];
}

// Glossary terms data - Start with high-priority terms
export const glossaryTerms: Record<string, GlossaryTerm> = {
  "feasibility-study": {
    slug: "feasibility-study",
    term: "Feasibility Study",
    definition: "A comprehensive analysis that evaluates the viability, market potential, and financial prospects of a proposed outdoor hospitality project, such as a glamping resort, RV park, or campground.",
    extendedDefinition: `A feasibility study is a critical business analysis tool used in the outdoor hospitality industry to determine whether a proposed project is viable, profitable, and worth pursuing. For outdoor hospitality projects like glamping resorts, RV parks, and campgrounds, a feasibility study examines multiple factors including market demand, competitive landscape, financial projections, site suitability, regulatory requirements, and risk assessment.

The study typically includes market analysis to understand demand and competition, financial modeling to project revenues and expenses, site analysis to evaluate location suitability, and strategic recommendations for development. Feasibility studies are essential for securing financing, as banks and lenders require them to assess project risk and viability.

Sage Outdoor Advisory specializes in creating comprehensive, bank-approved feasibility studies for outdoor hospitality projects. Our studies provide investors, developers, and lenders with the detailed analysis needed to make informed decisions about project development and financing.`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["market-analysis", "appraisal", "revenue-projections", "competitive-analysis"],
    examples: [
      "A glamping resort feasibility study might analyze demand in a mountain region",
      "An RV park feasibility study could evaluate market potential near a national park",
      "A campground feasibility study might assess seasonal demand patterns"
    ],
    useCases: [
      "Securing bank financing for development projects",
      "Evaluating investment opportunities",
      "Making go/no-go decisions on projects",
      "Understanding market potential before purchase"
    ],
    seoKeywords: ["feasibility study", "feasibility analysis", "project feasibility", "business feasibility", "feasibility report"],
    internalLinks: [
      { text: "Glamping Feasibility Study", url: "/landing/glamping-feasibility-study" },
      { text: "RV Resort Feasibility Study", url: "/landing/rv-resort-feasibility-study" },
      { text: "Campground Feasibility Study", url: "/landing/campground-feasibility-study" },
      { text: "Glamping Feasibility Study Services", url: "https://sageoutdooradvisory.com/our-services/feasibility-studies/glamping-resorts/" },
      { text: "RV Resort Feasibility Study Services", url: "https://sageoutdooradvisory.com/our-services/feasibility-studies/rv-resorts/" },
      { text: "Campground Feasibility Study Services", url: "https://sageoutdooradvisory.com/our-services/feasibility-studies/campgrounds/" },
      { text: "All Feasibility Study Services", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "How long does a feasibility study take?",
        answer: "A comprehensive feasibility study typically takes 4-6 weeks to complete, depending on project complexity and data availability."
      },
      {
        question: "What's included in a feasibility study?",
        answer: "A feasibility study includes market analysis, competitive assessment, financial projections, site evaluation, and strategic recommendations."
      },
      {
        question: "Do banks accept feasibility studies?",
        answer: "Yes, banks and lenders require professional feasibility studies to assess project viability and risk before approving financing."
      }
    ]
  },
  "appraisal": {
    slug: "appraisal",
    term: "Appraisal",
    definition: "A professional assessment of a property's value conducted by a certified appraiser, used for financing, sales, insurance, and investment decisions in the outdoor hospitality industry.",
    extendedDefinition: `An appraisal is a formal, unbiased evaluation of a property's market value performed by a licensed or certified appraiser. In the outdoor hospitality industry, appraisals are essential for glamping resorts, RV parks, campgrounds, and other outdoor accommodation properties.

Appraisers use three primary approaches to determine value: the sales comparison approach (comparing to similar sold properties), the income approach (valuing based on income potential), and the cost approach (estimating replacement cost). For outdoor hospitality properties, the income approach is often most relevant since these are income-producing assets.

Appraisals are required for bank financing, property sales, refinancing, insurance purposes, and investment analysis. Sage Outdoor Advisory provides specialized appraisals for outdoor hospitality properties, understanding the unique characteristics and valuation methods required for these asset types.`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["feasibility-study", "cap-rate", "noi", "income-approach"],
    examples: [
      "A glamping property appraisal for bank financing",
      "An RV resort appraisal for sale purposes",
      "A campground appraisal for refinancing"
    ],
    useCases: [
      "Securing bank loans and financing",
      "Property sales and acquisitions",
      "Refinancing existing properties",
      "Insurance valuation",
      "Investment analysis"
    ],
    seoKeywords: ["property appraisal", "real estate appraisal", "business appraisal", "valuation", "appraised value"],
    internalLinks: [
      { text: "Glamping Appraisal", url: "/landing/glamping-appraisal" },
      { text: "RV Resort Appraisal", url: "/landing/rv-resort-appraisal" },
      { text: "Glamping Property Appraisal Services", url: "https://sageoutdooradvisory.com/our-services/appraisals/glamping-resorts/" },
      { text: "RV Resort Appraisal Services", url: "https://sageoutdooradvisory.com/our-services/appraisals/rv-resorts/" },
      { text: "All Appraisal Services", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "How much does an appraisal cost?",
        answer: "Appraisal costs vary based on property size, complexity, and location. Contact us for a customized quote."
      },
      {
        question: "How long does an appraisal take?",
        answer: "A comprehensive property appraisal typically takes 2-4 weeks to complete."
      },
      {
        question: "Why do I need a specialized appraiser for outdoor hospitality?",
        answer: "Outdoor hospitality properties have unique characteristics, revenue models, and market dynamics that require specialized appraisal expertise."
      }
    ]
  },
  "glamping": {
    slug: "glamping",
    term: "Glamping",
    definition: "A portmanteau of 'glamorous' and 'camping,' glamping refers to luxury outdoor accommodations that combine the experience of camping with the comfort and amenities of a hotel.",
    extendedDefinition: `Glamping, short for "glamorous camping," is a form of outdoor hospitality that merges the natural setting and adventure of camping with the luxury, comfort, and amenities typically found in high-end hotels. Unlike traditional camping, glamping accommodations feature real beds, electricity, heating and cooling, private bathrooms, and often include premium amenities like hot tubs, gourmet kitchens, and concierge services.

Common glamping accommodations include safari tents, yurts, treehouses, Airstream trailers, tiny houses, canvas tents, and glamping pods. These structures are typically situated in scenic locations such as mountains, forests, deserts, or near national parks, offering guests an immersive outdoor experience without sacrificing comfort.

The glamping industry has experienced significant growth as travelers seek unique, experiential accommodations that connect them with nature while maintaining modern conveniences. Glamping appeals to a wide demographic, from couples seeking romantic getaways to families wanting outdoor adventures with comfort.

Sage Outdoor Advisory provides feasibility studies and appraisals specifically for glamping properties, understanding the unique market dynamics, revenue models, and valuation methods required for these specialized accommodations.`,
    category: "Glamping",
    relatedTerms: ["glamping-resort", "safari-tent", "yurt", "outdoor-hospitality"],
    examples: [
      "A luxury safari tent with king bed and private bathroom in a mountain setting",
      "A treehouse glamping accommodation with hot tub and full kitchen",
      "A yurt glamping experience near a national park"
    ],
    useCases: [
      "Developing glamping resorts",
      "Adding glamping units to existing properties",
      "Converting land to glamping use",
      "Valuing glamping properties"
    ],
    seoKeywords: ["glamping", "glamorous camping", "luxury camping", "glamping resort", "glamping accommodation"],
    internalLinks: [
      { text: "Glamping Feasibility Study", url: "/landing/glamping-feasibility-study" },
      { text: "Glamping Appraisal", url: "/landing/glamping-appraisal" },
      { text: "Glamping Market Report", url: "https://sageoutdooradvisory.com/market-reports/" }
    ],
    faqs: [
      {
        question: "What's the difference between glamping and camping?",
        answer: "Glamping provides luxury amenities and comfort (real beds, bathrooms, electricity) while camping is more basic with tents and minimal amenities."
      },
      {
        question: "How much does it cost to start a glamping business?",
        answer: "Startup costs vary significantly based on location, number of units, and amenities. A feasibility study can help determine specific costs for your project."
      },
      {
        question: "Is glamping profitable?",
        answer: "Glamping can be highly profitable with proper planning, location selection, and market analysis. Our feasibility studies help assess profitability potential."
      }
    ]
  },
  "adr": {
    slug: "adr",
    term: "ADR (Average Daily Rate)",
    definition: "The average revenue earned per occupied accommodation unit per day, calculated by dividing total room revenue by the number of rooms sold.",
    extendedDefinition: `ADR, or Average Daily Rate, is a key performance metric in the hospitality industry, including outdoor hospitality properties like glamping resorts, RV parks, and campgrounds. It represents the average revenue generated per occupied unit per day.

ADR is calculated by dividing total room revenue by the number of rooms sold (not available). For example, if a glamping resort generated $10,000 in revenue from 20 occupied units, the ADR would be $500.

ADR is crucial for revenue management and pricing strategy. It helps property owners understand their pricing effectiveness, compare performance to competitors, and optimize revenue. ADR can vary significantly based on seasonality, location, amenities, and market conditions.

In outdoor hospitality, ADR is often higher for glamping accommodations compared to traditional campgrounds due to the luxury positioning and amenities. Understanding ADR benchmarks for your market and property type is essential for financial planning and feasibility analysis.

Sage Outdoor Advisory includes ADR analysis and benchmarking in our feasibility studies, helping clients understand market rates and optimize pricing strategies.`,
    category: "Financial",
    relatedTerms: ["revpar", "occupancy-rate", "revenue-projections", "noi"],
    examples: [
      "A glamping resort with $300 ADR during peak season",
      "An RV park with $75 ADR for full hookup sites",
      "A campground with $45 ADR for tent sites"
    ],
    useCases: [
      "Pricing strategy development",
      "Revenue forecasting",
      "Competitive analysis",
      "Financial modeling"
    ],
    seoKeywords: ["ADR", "average daily rate", "room rate", "daily rate", "revenue per room"],
    internalLinks: [
      { text: "Market Reports", url: "https://sageoutdooradvisory.com/market-reports/" },
      { text: "Data Insights", url: "https://sageoutdooradvisory.com/data-insights/" }
    ],
    faqs: [
      {
        question: "How is ADR calculated?",
        answer: "ADR = Total Room Revenue ÷ Number of Rooms Sold. It represents the average revenue per occupied unit per day."
      },
      {
        question: "What's a good ADR for glamping?",
        answer: "ADR varies by location and amenities. Our market reports provide ADR benchmarks by region and property type."
      },
      {
        question: "How does ADR relate to profitability?",
        answer: "ADR, combined with occupancy rate, determines RevPAR (Revenue Per Available Room), which directly impacts profitability."
      }
    ]
  },
  "occupancy-rate": {
    slug: "occupancy-rate",
    term: "Occupancy Rate",
    definition: "The percentage of available accommodation units that are occupied during a specific period, calculated by dividing occupied units by total available units.",
    extendedDefinition: `Occupancy rate is a fundamental performance metric in the hospitality industry, measuring the percentage of available units that are occupied during a given period. It's calculated by dividing the number of occupied units by the total number of available units, then multiplying by 100.

For example, if a glamping resort has 20 units and 16 are occupied, the occupancy rate is 80%. Occupancy rates can be measured daily, monthly, or annually, with annual rates providing the most comprehensive view of performance.

Occupancy rate is critical for understanding demand, pricing effectiveness, and revenue potential. High occupancy rates indicate strong demand but may suggest pricing is too low. Low occupancy rates may indicate pricing issues, marketing challenges, or market saturation.

In outdoor hospitality, occupancy rates often vary seasonally. For example, properties near national parks may have 90%+ occupancy in summer but 30% in winter. Understanding seasonal patterns is essential for financial planning and feasibility analysis.

Sage Outdoor Advisory includes occupancy rate analysis and forecasting in our feasibility studies, helping clients understand demand patterns and optimize revenue management strategies.`,
    category: "Financial",
    relatedTerms: ["adr", "revpar", "revenue-projections", "seasonality"],
    examples: [
      "A glamping resort with 75% annual occupancy rate",
      "An RV park with 85% occupancy during peak season",
      "A campground with 60% occupancy year-round"
    ],
    useCases: [
      "Demand forecasting",
      "Revenue projections",
      "Pricing strategy",
      "Market analysis"
    ],
    seoKeywords: ["occupancy rate", "occupancy percentage", "room occupancy", "occupancy metrics"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" },
      { text: "Market Reports", url: "https://sageoutdooradvisory.com/market-reports/" }
    ],
    faqs: [
      {
        question: "What's a good occupancy rate?",
        answer: "Occupancy rates vary by property type and location. Generally, 60-80% annual occupancy is considered healthy for outdoor hospitality properties."
      },
      {
        question: "How does occupancy rate affect revenue?",
        answer: "Occupancy rate, combined with ADR, determines RevPAR (Revenue Per Available Room), which directly impacts total revenue."
      },
      {
        question: "How do I improve occupancy rate?",
        answer: "Improving occupancy may involve pricing adjustments, marketing efforts, adding amenities, or targeting new market segments."
      }
    ]
  },
  // Additional Feasibility & Appraisal Terms
  "market-analysis": {
    slug: "market-analysis",
    term: "Market Analysis",
    definition: "A comprehensive evaluation of market conditions, demand, competition, and trends that informs business decisions for outdoor hospitality projects.",
    extendedDefinition: `Market analysis is a critical component of feasibility studies and business planning for outdoor hospitality properties. It involves examining the local and regional market to understand demand patterns, competitive landscape, pricing dynamics, and growth trends.

A thorough market analysis includes demographic research, tourism data analysis, competitive property assessment, demand forecasting, and identification of market opportunities and threats. For glamping resorts, RV parks, and campgrounds, market analysis helps determine if there's sufficient demand to support a new or expanded property.

Sage Outdoor Advisory conducts detailed market analysis as part of our feasibility studies, providing clients with actionable insights about market potential, competitive positioning, and strategic recommendations for success.`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["feasibility-study", "competitive-analysis", "revenue-projections", "occupancy-rate"],
    examples: [
      "Analyzing demand for glamping accommodations in a mountain region",
      "Evaluating RV park competition in a tourist destination",
      "Assessing campground market saturation in a state park area"
    ],
    useCases: [
      "Feasibility studies",
      "Investment analysis",
      "Competitive positioning",
      "Pricing strategy development"
    ],
    seoKeywords: ["market analysis", "market research", "market assessment", "market evaluation", "demand analysis"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" },
      { text: "Market Reports", url: "https://sageoutdooradvisory.com/market-reports/" }
    ],
    faqs: [
      {
        question: "What's included in a market analysis?",
        answer: "Market analysis typically includes demographic research, competitive assessment, demand forecasting, pricing analysis, and identification of market opportunities."
      },
      {
        question: "How long does a market analysis take?",
        answer: "Market analysis is typically completed as part of a comprehensive feasibility study, which takes 4-6 weeks."
      }
    ]
  },
  "competitive-analysis": {
    slug: "competitive-analysis",
    term: "Competitive Analysis",
    definition: "An assessment of competing properties and businesses in the market to understand competitive positioning, pricing, and market share.",
    extendedDefinition: `Competitive analysis is a key component of market research that examines existing and potential competitors in the outdoor hospitality market. It involves identifying competing properties, analyzing their offerings, pricing, occupancy rates, amenities, and market positioning.

For outdoor hospitality projects, competitive analysis helps developers understand the competitive landscape, identify market gaps, and develop strategies to differentiate their property. It includes analyzing both direct competitors (similar properties) and indirect competitors (alternative accommodations).

Sage Outdoor Advisory includes comprehensive competitive analysis in our feasibility studies, helping clients understand their competitive position and develop strategies for success.`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["market-analysis", "feasibility-study", "revenue-projections", "adr"],
    examples: [
      "Comparing glamping resorts in a specific region",
      "Analyzing RV park competition and pricing",
      "Assessing campground market share"
    ],
    useCases: [
      "Feasibility studies",
      "Pricing strategy",
      "Market positioning",
      "Investment analysis"
    ],
    seoKeywords: ["competitive analysis", "competitor analysis", "market competition", "competitive landscape"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "Why is competitive analysis important?",
        answer: "Competitive analysis helps you understand your market position, identify opportunities, and develop strategies to differentiate your property."
      }
    ]
  },
  "revenue-projections": {
    slug: "revenue-projections",
    term: "Revenue Projections",
    definition: "Forecasted income estimates for a property based on occupancy rates, average daily rates, and other revenue sources over a specific time period.",
    extendedDefinition: `Revenue projections are financial forecasts that estimate future income for an outdoor hospitality property. They are based on assumptions about occupancy rates, average daily rates (ADR), seasonal variations, and other revenue streams such as amenities, activities, or retail.

For feasibility studies, revenue projections typically cover 5-10 years and include best-case, base-case, and worst-case scenarios. They help investors and lenders understand the income potential of a project and assess financial viability.

Sage Outdoor Advisory creates detailed revenue projections as part of our feasibility studies, using market data, competitive analysis, and industry benchmarks to provide realistic and defensible forecasts.`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["adr", "occupancy-rate", "revpar", "feasibility-study", "noi"],
    examples: [
      "5-year revenue forecast for a new glamping resort",
      "Seasonal revenue projections for an RV park",
      "Annual revenue estimates for a campground expansion"
    ],
    useCases: [
      "Feasibility studies",
      "Financial planning",
      "Loan applications",
      "Investment analysis"
    ],
    seoKeywords: ["revenue projections", "revenue forecast", "income projections", "revenue estimates"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "How accurate are revenue projections?",
        answer: "Revenue projections are estimates based on market data and assumptions. Accuracy depends on the quality of market research and the stability of market conditions."
      },
      {
        question: "What time period do revenue projections cover?",
        answer: "Revenue projections in feasibility studies typically cover 5-10 years, with detailed annual and sometimes monthly breakdowns."
      }
    ]
  },
  "revpar": {
    slug: "revpar",
    term: "RevPAR (Revenue Per Available Room)",
    definition: "A key hospitality metric calculated by multiplying average daily rate (ADR) by occupancy rate, representing revenue per available accommodation unit.",
    extendedDefinition: `RevPAR, or Revenue Per Available Room (or unit), is a critical performance metric in the hospitality industry. It's calculated by multiplying the Average Daily Rate (ADR) by the Occupancy Rate, or by dividing total room revenue by the number of available rooms.

RevPAR provides a single metric that combines both pricing and occupancy performance, making it useful for comparing properties and tracking performance over time. For outdoor hospitality properties, RevPAR helps owners understand revenue efficiency and optimize pricing strategies.

For example, if a glamping resort has an ADR of $200 and 75% occupancy, the RevPAR would be $150 ($200 × 0.75). This means the property generates $150 per available unit, regardless of whether it's occupied.

Sage Outdoor Advisory includes RevPAR analysis and benchmarking in our feasibility studies, helping clients understand revenue potential and optimize performance.`,
    category: "Financial",
    relatedTerms: ["adr", "occupancy-rate", "revenue-projections", "noi"],
    examples: [
      "A glamping resort with $200 ADR and 80% occupancy has $160 RevPAR",
      "An RV park with $75 ADR and 70% occupancy has $52.50 RevPAR"
    ],
    useCases: [
      "Performance measurement",
      "Revenue optimization",
      "Competitive benchmarking",
      "Financial analysis"
    ],
    seoKeywords: ["RevPAR", "revenue per available room", "revenue per available unit", "RevPAR calculation"],
    internalLinks: [
      { text: "Market Reports", url: "https://sageoutdooradvisory.com/market-reports/" }
    ],
    faqs: [
      {
        question: "How is RevPAR calculated?",
        answer: "RevPAR = ADR × Occupancy Rate, or RevPAR = Total Room Revenue ÷ Number of Available Rooms."
      },
      {
        question: "What's a good RevPAR?",
        answer: "RevPAR varies significantly by property type, location, and market. Our market reports provide RevPAR benchmarks by region and property type."
      }
    ]
  },
  "noi": {
    slug: "noi",
    term: "NOI (Net Operating Income)",
    definition: "The income generated from a property after subtracting operating expenses but before deducting debt service, taxes, and capital expenditures.",
    extendedDefinition: `Net Operating Income (NOI) is a fundamental financial metric for income-producing properties like glamping resorts, RV parks, and campgrounds. It represents the property's profitability from operations before financing costs and taxes.

NOI is calculated by subtracting operating expenses from gross operating income. Operating expenses include utilities, maintenance, insurance, property management, marketing, and other day-to-day costs, but exclude debt service, income taxes, and capital improvements.

NOI is critical for property valuation, as it's used in the income approach to determine property value. It's also used to calculate the capitalization rate (cap rate) and assess a property's ability to service debt.

Sage Outdoor Advisory includes NOI projections and analysis in our feasibility studies and appraisals, helping clients understand property profitability and value.`,
    category: "Financial",
    relatedTerms: ["cap-rate", "revenue-projections", "operating-expenses", "appraisal"],
    examples: [
      "A glamping resort with $500,000 gross income and $200,000 operating expenses has $300,000 NOI",
      "An RV park generating $1M revenue with $400K expenses has $600K NOI"
    ],
    useCases: [
      "Property valuation",
      "Investment analysis",
      "Loan underwriting",
      "Financial planning"
    ],
    seoKeywords: ["NOI", "net operating income", "operating income", "property NOI"],
    internalLinks: [
      { text: "Appraisals", url: "https://sageoutdooradvisory.com/our-services/" },
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "What expenses are included in NOI?",
        answer: "NOI includes all operating expenses like utilities, maintenance, insurance, and management, but excludes debt service, taxes, and capital improvements."
      },
      {
        question: "How is NOI used in property valuation?",
        answer: "NOI is divided by the capitalization rate to determine property value in the income approach to valuation."
      }
    ]
  },
  "cap-rate": {
    slug: "cap-rate",
    term: "Cap Rate (Capitalization Rate)",
    definition: "The rate of return on a real estate investment based on expected income, calculated by dividing net operating income by property value.",
    extendedDefinition: `The capitalization rate, or cap rate, is a key metric used to evaluate and compare real estate investments. It's calculated by dividing the Net Operating Income (NOI) by the property's value or purchase price.

Cap rates indicate the expected rate of return on an investment property, assuming it's purchased with cash (no financing). Higher cap rates suggest higher returns but may also indicate higher risk. Lower cap rates suggest lower returns but may indicate more stable, desirable properties.

For outdoor hospitality properties, cap rates vary by property type, location, and market conditions. Premium glamping resorts in desirable locations may have lower cap rates (5-7%), while basic campgrounds may have higher cap rates (8-12%).

Sage Outdoor Advisory uses cap rates in our appraisals and feasibility studies to help clients understand investment returns and property values.`,
    category: "Financial",
    relatedTerms: ["noi", "appraisal", "roi", "income-approach"],
    examples: [
      "A property with $300K NOI valued at $4M has a 7.5% cap rate",
      "A glamping resort with $500K NOI and $6M value has an 8.3% cap rate"
    ],
    useCases: [
      "Property valuation",
      "Investment comparison",
      "Return analysis",
      "Purchase decisions"
    ],
    seoKeywords: ["cap rate", "capitalization rate", "real estate cap rate", "investment cap rate"],
    internalLinks: [
      { text: "Appraisals", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "What's a good cap rate?",
        answer: "Cap rates vary by property type and market. Generally, 6-10% is common for outdoor hospitality properties, with premium properties having lower rates."
      },
      {
        question: "How is cap rate calculated?",
        answer: "Cap Rate = Net Operating Income ÷ Property Value (or Purchase Price)."
      }
    ]
  },
  "roi": {
    slug: "roi",
    term: "ROI (Return on Investment)",
    definition: "A performance measure that calculates the percentage return on an investment relative to its cost.",
    extendedDefinition: `Return on Investment (ROI) is a fundamental financial metric that measures the profitability of an investment. It's calculated by dividing the net profit (or gain) from an investment by the initial cost, then multiplying by 100 to get a percentage.

ROI helps investors compare different investment opportunities and assess whether an investment is worthwhile. For outdoor hospitality properties, ROI considers both income returns and potential appreciation.

ROI can be calculated for different time periods (annual ROI, 5-year ROI, etc.) and can include or exclude factors like financing costs, taxes, and appreciation. It's often used alongside other metrics like cap rate, IRR, and cash-on-cash return.

Sage Outdoor Advisory includes ROI analysis in our feasibility studies, helping clients understand the potential returns on their outdoor hospitality investments.`,
    category: "Financial",
    relatedTerms: ["irr", "cap-rate", "cash-on-cash-return", "feasibility-study"],
    examples: [
      "An investment of $2M generating $200K annual profit has 10% ROI",
      "A glamping resort purchase with 15% annual ROI"
    ],
    useCases: [
      "Investment analysis",
      "Feasibility studies",
      "Investment comparison",
      "Financial planning"
    ],
    seoKeywords: ["ROI", "return on investment", "investment return", "ROI calculation"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "How is ROI calculated?",
        answer: "ROI = (Net Profit ÷ Investment Cost) × 100. It's expressed as a percentage."
      },
      {
        question: "What's a good ROI for outdoor hospitality?",
        answer: "ROI varies by property type and market. Generally, 10-20% annual ROI is considered strong for outdoor hospitality investments."
      }
    ]
  },
  "income-approach": {
    slug: "income-approach",
    term: "Income Approach",
    definition: "A property valuation method that determines value based on the property's income-generating potential, typically using NOI and cap rate.",
    extendedDefinition: `The income approach is one of three primary methods used to value real estate properties, particularly income-producing properties like glamping resorts, RV parks, and campgrounds. This approach values a property based on its ability to generate income.

The income approach typically uses the formula: Property Value = Net Operating Income (NOI) ÷ Capitalization Rate (Cap Rate). This method assumes that a property's value is directly related to its income potential.

For outdoor hospitality properties, the income approach is often the most relevant valuation method since these are income-producing assets. Appraisers analyze historical income, projected income, operating expenses, and market cap rates to determine value.

Sage Outdoor Advisory uses the income approach in our appraisals, along with sales comparison and cost approaches, to provide comprehensive property valuations.`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["appraisal", "noi", "cap-rate", "dcf"],
    examples: [
      "Valuing a glamping resort based on $400K NOI and 7% cap rate = $5.7M value",
      "Using income approach to appraise an RV park"
    ],
    useCases: [
      "Property appraisals",
      "Investment analysis",
      "Purchase decisions",
      "Loan underwriting"
    ],
    seoKeywords: ["income approach", "income valuation", "property valuation", "income method"],
    internalLinks: [
      { text: "Appraisals", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "When is the income approach used?",
        answer: "The income approach is most appropriate for income-producing properties like glamping resorts, RV parks, and campgrounds."
      },
      {
        question: "How does income approach differ from other valuation methods?",
        answer: "The income approach focuses on income potential, while sales comparison uses similar sales and cost approach uses replacement cost."
      }
    ]
  },
  "comparable-sales": {
    slug: "comparable-sales",
    term: "Comparable Sales",
    definition: "Similar properties that have recently sold, used as benchmarks to determine a property's market value in the sales comparison approach.",
    extendedDefinition: `Comparable sales, or "comps," are recently sold properties that are similar to the subject property in terms of location, size, amenities, condition, and income potential. Appraisers use comparable sales in the sales comparison approach to estimate a property's market value.

For outdoor hospitality properties, finding true comparables can be challenging due to the unique nature of each property. Appraisers look for properties with similar unit counts, amenities, locations, and income characteristics.

The sales comparison approach adjusts comparable sales for differences between the comp and the subject property, such as location, size, condition, and income. These adjustments help determine an accurate market value.

Sage Outdoor Advisory has extensive knowledge of outdoor hospitality property sales and uses comparable sales analysis in our appraisals to provide accurate valuations.`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["appraisal", "market-analysis", "income-approach"],
    examples: [
      "Comparing a glamping resort to similar recently sold glamping properties",
      "Using RV park sales to value a subject RV park"
    ],
    useCases: [
      "Property appraisals",
      "Purchase price determination",
      "Market value assessment"
    ],
    seoKeywords: ["comparable sales", "comps", "comparable properties", "sales comparison"],
    internalLinks: [
      { text: "Appraisals", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "How many comparable sales are needed?",
        answer: "Typically, appraisers use 3-5 comparable sales, though more may be used if available and relevant."
      }
    ]
  },
  "cost-approach": {
    slug: "cost-approach",
    term: "Cost Approach",
    definition: "A property valuation method that estimates value based on the cost to replace or reproduce the property, minus depreciation, plus land value.",
    extendedDefinition: `The cost approach is one of three primary property valuation methods. It estimates a property's value by calculating what it would cost to replace or reproduce the property, accounting for depreciation, and adding the land value.

This approach is based on the principle that a buyer wouldn't pay more for a property than it would cost to build a similar one. It's particularly useful for new or recently constructed properties, unique properties with few comparables, or when the income approach isn't applicable.

For outdoor hospitality properties, the cost approach considers the cost of site improvements, structures, amenities, and infrastructure, minus depreciation for age and condition, plus the underlying land value.

Sage Outdoor Advisory uses the cost approach in our appraisals, particularly for new developments or unique properties, to provide comprehensive valuation analysis.`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["appraisal", "income-approach", "comparable-sales"],
    examples: [
      "Valuing a new glamping resort based on construction costs",
      "Using cost approach for a unique campground development"
    ],
    useCases: [
      "New construction appraisals",
      "Unique property valuations",
      "Insurance valuations"
    ],
    seoKeywords: ["cost approach", "replacement cost", "cost valuation", "reproduction cost"],
    internalLinks: [
      { text: "Appraisals", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "When is the cost approach most useful?",
        answer: "The cost approach is most useful for new properties, unique properties with few comparables, or when income data isn't available."
      }
    ]
  },
  "dcf": {
    slug: "dcf",
    term: "DCF (Discounted Cash Flow)",
    definition: "A valuation method that estimates property value by discounting projected future cash flows to their present value.",
    extendedDefinition: `Discounted Cash Flow (DCF) is a sophisticated valuation method used to estimate the value of an investment based on its expected future cash flows. The method discounts these future cash flows back to their present value using a discount rate that reflects the risk and time value of money.

DCF analysis is particularly useful for properties with varying income streams over time, development projects, or when detailed financial projections are available. It accounts for the time value of money, recognizing that a dollar received today is worth more than a dollar received in the future.

For outdoor hospitality properties, DCF analysis can be used in feasibility studies to evaluate project viability and in appraisals for properties with complex income structures or development potential.

Sage Outdoor Advisory uses DCF analysis in our feasibility studies and appraisals when appropriate, providing detailed financial modeling and valuation.`,
    category: "Financial",
    relatedTerms: ["feasibility-study", "revenue-projections", "roi", "irr"],
    examples: [
      "Valuing a glamping resort based on 10-year cash flow projections",
      "Using DCF to evaluate a campground development project"
    ],
    useCases: [
      "Feasibility studies",
      "Development project valuation",
      "Investment analysis"
    ],
    seoKeywords: ["DCF", "discounted cash flow", "cash flow valuation", "DCF analysis"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "What's the difference between DCF and cap rate?",
        answer: "DCF uses detailed cash flow projections over time, while cap rate uses a single year's NOI. DCF is more detailed but requires more assumptions."
      }
    ]
  },
  "irr": {
    slug: "irr",
    term: "IRR (Internal Rate of Return)",
    definition: "The annualized rate of return that makes the net present value of all cash flows from an investment equal to zero.",
    extendedDefinition: `The Internal Rate of Return (IRR) is a financial metric used to evaluate the profitability of an investment. It's the discount rate at which the net present value (NPV) of all cash flows (both positive and negative) equals zero.

IRR is particularly useful for comparing investment opportunities with different cash flow patterns and timeframes. A higher IRR indicates a more attractive investment opportunity. IRR accounts for the timing of cash flows, making it more sophisticated than simple ROI calculations.

For outdoor hospitality investments, IRR helps investors understand the annualized return on their investment, considering both income and eventual sale proceeds. It's commonly used in feasibility studies and investment analysis.

Sage Outdoor Advisory includes IRR analysis in our feasibility studies, helping clients evaluate investment returns and compare opportunities.`,
    category: "Financial",
    relatedTerms: ["roi", "dcf", "cash-on-cash-return", "feasibility-study"],
    examples: [
      "A glamping resort investment with 18% IRR over 10 years",
      "Comparing two RV park opportunities using IRR"
    ],
    useCases: [
      "Investment comparison",
      "Feasibility studies",
      "Return analysis"
    ],
    seoKeywords: ["IRR", "internal rate of return", "investment IRR", "IRR calculation"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "What's a good IRR?",
        answer: "IRR expectations vary by risk and market. Generally, 15-25% IRR is considered strong for outdoor hospitality investments."
      },
      {
        question: "How is IRR different from ROI?",
        answer: "IRR accounts for the timing of cash flows and provides an annualized rate, while ROI is a simple percentage return."
      }
    ]
  },
  "cash-on-cash-return": {
    slug: "cash-on-cash-return",
    term: "Cash-on-Cash Return",
    definition: "The annual return on the actual cash invested in a property, calculated by dividing annual pre-tax cash flow by total cash invested.",
    extendedDefinition: `Cash-on-cash return is a key metric for real estate investors, especially those using financing. It measures the annual return on the actual cash invested (down payment and initial costs), not the total property value.

This metric is particularly important for leveraged investments, where the investor puts down a portion of the purchase price and finances the rest. Cash-on-cash return shows the return on the investor's actual cash outlay.

For example, if an investor puts $500,000 down on a $2M property and receives $60,000 in annual cash flow, the cash-on-cash return is 12% ($60,000 ÷ $500,000).

Sage Outdoor Advisory includes cash-on-cash return analysis in our feasibility studies, helping investors understand returns on their actual cash investment.`,
    category: "Financial",
    relatedTerms: ["roi", "irr", "noi", "feasibility-study"],
    examples: [
      "A $500K down payment generating $60K annual cash flow = 12% cash-on-cash return",
      "Comparing cash-on-cash returns for different financing scenarios"
    ],
    useCases: [
      "Leveraged investment analysis",
      "Financing decisions",
      "Investment comparison"
    ],
    seoKeywords: ["cash on cash return", "cash-on-cash", "cash return", "investment return"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "How is cash-on-cash return calculated?",
        answer: "Cash-on-Cash Return = Annual Pre-Tax Cash Flow ÷ Total Cash Invested (down payment + initial costs)."
      },
      {
        question: "What's a good cash-on-cash return?",
        answer: "Cash-on-cash returns vary by financing and risk. Generally, 8-15% is considered good for outdoor hospitality investments."
      }
    ]
  },
  "debt-service-coverage-ratio": {
    slug: "debt-service-coverage-ratio",
    term: "Debt Service Coverage Ratio (DSCR)",
    definition: "A financial ratio that measures a property's ability to cover its debt payments, calculated by dividing NOI by annual debt service.",
    extendedDefinition: `The Debt Service Coverage Ratio (DSCR) is a critical metric used by lenders to assess a borrower's ability to repay a loan. It's calculated by dividing the property's Net Operating Income (NOI) by its annual debt service (principal and interest payments).

Lenders typically require a DSCR of 1.25 to 1.5 or higher, meaning the property's income must be 25-50% higher than its debt payments. This provides a safety margin in case of income fluctuations.

For outdoor hospitality properties, DSCR is particularly important due to seasonal income variations. Lenders want assurance that the property can service debt even during slower periods.

Sage Outdoor Advisory includes DSCR analysis in our feasibility studies, helping clients understand loan requirements and optimize financing structures.`,
    category: "Financial",
    relatedTerms: ["noi", "feasibility-study", "roi"],
    examples: [
      "A property with $300K NOI and $200K debt service has 1.5 DSCR",
      "Lenders requiring minimum 1.25 DSCR for RV park loans"
    ],
    useCases: [
      "Loan applications",
      "Financing analysis",
      "Feasibility studies"
    ],
    seoKeywords: ["DSCR", "debt service coverage", "debt coverage ratio", "loan coverage"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "What DSCR do lenders require?",
        answer: "Most lenders require a minimum DSCR of 1.25 to 1.5, meaning income must be 25-50% higher than debt payments."
      },
      {
        question: "How is DSCR calculated?",
        answer: "DSCR = Net Operating Income ÷ Annual Debt Service (principal + interest payments)."
      }
    ]
  },
  "pro-forma": {
    slug: "pro-forma",
    term: "Pro Forma",
    definition: "Financial projections or statements that show expected future performance based on assumptions and estimates, rather than historical data.",
    extendedDefinition: `Pro forma financial statements are forward-looking financial projections that estimate future income, expenses, and cash flows based on assumptions and market analysis. Unlike historical financial statements, pro forma statements project what financial performance is expected to be.

For outdoor hospitality projects, pro forma statements are essential for feasibility studies, loan applications, and investment analysis. They typically include projected income statements, cash flow statements, and balance sheets for 5-10 years.

Pro forma statements help investors, lenders, and developers understand the expected financial performance of a project and make informed decisions. They're based on market analysis, competitive research, and industry benchmarks.

Sage Outdoor Advisory creates detailed pro forma financial statements as part of our feasibility studies, providing clients with comprehensive financial projections for their projects.`,
    category: "Financial",
    relatedTerms: ["revenue-projections", "feasibility-study", "noi"],
    examples: [
      "5-year pro forma income statement for a glamping resort",
      "Pro forma cash flow projections for an RV park development"
    ],
    useCases: [
      "Feasibility studies",
      "Loan applications",
      "Investment analysis",
      "Business planning"
    ],
    seoKeywords: ["pro forma", "pro forma financials", "financial projections", "pro forma statements"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "What's included in pro forma statements?",
        answer: "Pro forma statements typically include projected income, expenses, cash flows, and balance sheets for multiple years."
      }
    ]
  },
  "ebitda": {
    slug: "ebitda",
    term: "EBITDA",
    definition: "Earnings Before Interest, Taxes, Depreciation, and Amortization - a measure of operating profitability that excludes financing and accounting decisions.",
    extendedDefinition: `EBITDA is a financial metric that measures a company's operating performance by excluding the effects of financing decisions, tax strategies, and accounting methods. It's calculated by adding back interest, taxes, depreciation, and amortization to net income.

EBITDA is useful for comparing the operating performance of different properties or companies, as it removes the impact of different financing structures, tax situations, and depreciation methods. It provides a clearer picture of operational profitability.

For outdoor hospitality properties, EBITDA helps investors and lenders understand the property's core operating performance, separate from financing and tax considerations.

Sage Outdoor Advisory includes EBITDA analysis in our feasibility studies and financial projections, helping clients understand operational profitability.`,
    category: "Financial",
    relatedTerms: ["noi", "revenue-projections", "feasibility-study"],
    examples: [
      "A glamping resort with $500K EBITDA",
      "Comparing EBITDA across multiple RV park properties"
    ],
    useCases: [
      "Financial analysis",
      "Investment comparison",
      "Operational performance measurement"
    ],
    seoKeywords: ["EBITDA", "earnings before interest taxes", "operating profit", "EBITDA calculation"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "How is EBITDA calculated?",
        answer: "EBITDA = Net Income + Interest + Taxes + Depreciation + Amortization."
      }
    ]
  },
  // Glamping Terms
  "glamping-resort": {
    slug: "glamping-resort",
    term: "Glamping Resort",
    definition: "A luxury outdoor accommodation destination featuring high-end glamping units with premium amenities, often in scenic natural settings.",
    extendedDefinition: `A glamping resort is a commercial outdoor hospitality property that offers luxury camping accommodations, typically featuring multiple glamping units such as safari tents, yurts, treehouses, or other unique structures. Unlike basic campgrounds, glamping resorts provide premium amenities like private bathrooms, comfortable beds, heating and cooling, and often include on-site services like restaurants, activities, and concierge services.

Glamping resorts are positioned as upscale outdoor experiences, appealing to travelers who want to connect with nature without sacrificing comfort. They typically command higher rates than traditional camping and often include unique experiences or activities.

Sage Outdoor Advisory provides feasibility studies and appraisals specifically for glamping resorts, understanding the unique market dynamics, revenue models, and operational considerations of these properties.`,
    category: "Glamping",
    relatedTerms: ["glamping", "safari-tent", "yurt", "adr", "occupancy-rate"],
    examples: [
      "A 20-unit glamping resort in the mountains with safari tents and treehouses",
      "A coastal glamping resort featuring luxury Airstream trailers"
    ],
    useCases: [
      "Developing new glamping resorts",
      "Expanding existing glamping properties",
      "Valuing glamping resort investments"
    ],
    seoKeywords: ["glamping resort", "luxury glamping", "glamping property", "glamping destination"],
    internalLinks: [
      { text: "Glamping Feasibility Study", url: "/landing/glamping-feasibility-study" },
      { text: "Glamping Appraisal", url: "/landing/glamping-appraisal" }
    ],
    faqs: [
      {
        question: "What makes a glamping resort different from a campground?",
        answer: "Glamping resorts offer luxury accommodations with premium amenities, private bathrooms, and often on-site services, while campgrounds are more basic with shared facilities."
      }
    ]
  },
  "rv-resort": {
    slug: "rv-resort",
    term: "RV Resort",
    definition: "A high-end RV park offering premium amenities, services, and facilities for recreational vehicle travelers, typically with full hookups and resort-style features.",
    extendedDefinition: `An RV resort is an upscale RV park that provides premium amenities and services beyond basic RV parking. RV resorts typically feature full hookups (water, sewer, electric), paved sites, premium landscaping, and resort-style amenities such as pools, clubhouses, fitness centers, restaurants, and organized activities.

RV resorts are positioned as destinations rather than just overnight stops, often located in desirable locations near attractions, beaches, or scenic areas. They command higher rates than basic RV parks and appeal to travelers seeking a more luxurious RV experience.

Sage Outdoor Advisory provides feasibility studies and appraisals for RV resorts, understanding the premium positioning, amenities, and revenue potential of these properties.`,
    category: "RV & Campground",
    relatedTerms: ["rv-park", "full-hookup", "campground", "adr"],
    examples: [
      "A 200-site RV resort with pool, clubhouse, and restaurant",
      "A beachfront RV resort with premium amenities and activities"
    ],
    useCases: [
      "Developing RV resorts",
      "Upgrading RV parks to resort status",
      "Valuing RV resort properties"
    ],
    seoKeywords: ["RV resort", "luxury RV park", "RV resort amenities", "premium RV park"],
    internalLinks: [
      { text: "RV Resort Feasibility Study", url: "/landing/rv-resort-feasibility-study" },
      { text: "RV Resort Appraisal", url: "/landing/rv-resort-appraisal" }
    ],
    faqs: [
      {
        question: "What's the difference between an RV resort and RV park?",
        answer: "RV resorts offer premium amenities, services, and resort-style features, while RV parks are more basic with essential facilities."
      }
    ]
  },
  "rv-park": {
    slug: "rv-park",
    term: "RV Park",
    definition: "A facility providing spaces for recreational vehicles with basic to full amenities including electrical, water, and sewer hookups.",
    extendedDefinition: `An RV park is a commercial property that provides spaces, or sites, for recreational vehicles (RVs) to park and connect to utilities. RV parks range from basic facilities with minimal amenities to full-service parks with hookups, restrooms, laundry, and other services.

RV parks typically offer sites with electrical hookups (30 or 50 amp), water connections, and sometimes sewer connections. Basic RV parks may have shared restroom and shower facilities, while more developed parks may include additional amenities.

Sage Outdoor Advisory provides feasibility studies and appraisals for RV parks, understanding the operational requirements, revenue models, and market dynamics of these properties.`,
    category: "RV & Campground",
    relatedTerms: ["rv-resort", "full-hookup", "campground", "occupancy-rate"],
    examples: [
      "A 50-site RV park with full hookups and restroom facilities",
      "A basic RV park with electrical and water hookups only"
    ],
    useCases: [
      "Developing new RV parks",
      "Expanding existing RV facilities",
      "Valuing RV park investments"
    ],
    seoKeywords: ["RV park", "RV campground", "RV parking", "recreational vehicle park"],
    internalLinks: [
      { text: "RV Resort Feasibility Study", url: "/landing/rv-resort-feasibility-study" },
      { text: "RV Resort Appraisal", url: "/landing/rv-resort-appraisal" }
    ],
    faqs: [
      {
        question: "What amenities do RV parks typically offer?",
        answer: "RV parks typically offer electrical, water, and sometimes sewer hookups, along with restrooms, showers, and laundry facilities. Premium parks may include pools, clubhouses, and other amenities."
      }
    ]
  },
  "campground": {
    slug: "campground",
    term: "Campground",
    definition: "An outdoor facility providing spaces for tent camping and sometimes RVs, typically with basic amenities like restrooms, water, and fire pits.",
    extendedDefinition: `A campground is an outdoor facility that provides designated spaces for tent camping and sometimes RVs. Campgrounds range from primitive sites with minimal facilities to developed campgrounds with restrooms, showers, water, electrical hookups, and other amenities.

Campgrounds are typically located in scenic natural settings such as forests, mountains, or near lakes and rivers. They appeal to campers seeking an authentic outdoor experience, often at lower price points than glamping or RV resorts.

Sage Outdoor Advisory provides feasibility studies and appraisals for campgrounds, understanding the market demand, operational requirements, and revenue potential of these outdoor hospitality properties.`,
    category: "RV & Campground",
    relatedTerms: ["rv-park", "primitive-camping", "glamping", "occupancy-rate"],
    examples: [
      "A 100-site campground with restrooms, showers, and fire pits",
      "A primitive campground with minimal facilities in a national forest"
    ],
    useCases: [
      "Developing new campgrounds",
      "Expanding campground facilities",
      "Valuing campground properties"
    ],
    seoKeywords: ["campground", "camping facility", "tent camping", "campground development"],
    internalLinks: [
      { text: "Campground Feasibility Study", url: "/landing/campground-feasibility-study" }
    ],
    faqs: [
      {
        question: "What's the difference between a campground and RV park?",
        answer: "Campgrounds primarily serve tent campers with basic amenities, while RV parks are designed for recreational vehicles with hookups and RV-specific facilities."
      }
    ]
  },
  "full-hookup": {
    slug: "full-hookup",
    term: "Full Hookup",
    definition: "An RV or camping site that provides connections for water, sewer, and electrical service, allowing for complete self-contained operation.",
    extendedDefinition: `Full hookup refers to an RV or camping site that provides all three essential utility connections: water, sewer (or dump station access), and electrical service. This allows RVers to have complete self-contained operation without needing to move their RV for water, waste disposal, or power.

Full hookup sites are premium offerings at RV parks and resorts, typically commanding higher rates than partial hookup sites (which may only have water and electrical). The convenience of full hookups is particularly valued by long-term guests and those with larger RVs.

Sage Outdoor Advisory considers hookup types and amenities in our feasibility studies and appraisals, as they significantly impact site rates and property value.`,
    category: "RV & Campground",
    relatedTerms: ["rv-park", "rv-resort", "campground"],
    examples: [
      "A full hookup RV site with 50-amp electrical, water, and sewer connections",
      "Premium full hookup sites at an RV resort"
    ],
    useCases: [
      "RV park development planning",
      "Site pricing strategy",
      "Property valuation"
    ],
    seoKeywords: ["full hookup", "RV hookups", "full service RV site", "complete hookup"],
    internalLinks: [
      { text: "RV Resort Feasibility Study", url: "/landing/rv-resort-feasibility-study" }
    ],
    faqs: [
      {
        question: "What's included in a full hookup site?",
        answer: "A full hookup site includes water connection, sewer connection (or dump station access), and electrical service (typically 30 or 50 amp)."
      }
    ]
  },
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
  "operating-expenses": {
    slug: "operating-expenses",
    term: "Operating Expenses",
    definition: "The ongoing costs required to operate a property, including utilities, maintenance, insurance, management, and other day-to-day expenses.",
    extendedDefinition: `Operating expenses are the regular, recurring costs necessary to operate an outdoor hospitality property. These include utilities (electric, water, sewer, gas), maintenance and repairs, property insurance, property management fees, marketing, administrative costs, and other operational expenses.

Operating expenses are critical for financial planning and property valuation. They're subtracted from gross operating income to calculate Net Operating Income (NOI), which is used in property valuation and investment analysis.

For outdoor hospitality properties, operating expenses typically range from 30-50% of gross revenue, depending on property type, amenities, and management structure. Understanding operating expenses is essential for accurate financial projections and feasibility analysis.

Sage Outdoor Advisory includes detailed operating expense analysis in our feasibility studies and appraisals, using industry benchmarks and property-specific factors.`,
    category: "Financial",
    relatedTerms: ["noi", "revenue-projections", "feasibility-study"],
    examples: [
      "A glamping resort with $500K revenue and $200K operating expenses",
      "Operating expenses including utilities, maintenance, and management fees"
    ],
    useCases: [
      "Financial planning",
      "Property valuation",
      "Feasibility studies",
      "Investment analysis"
    ],
    seoKeywords: ["operating expenses", "property expenses", "operating costs", "property operating expenses"],
    internalLinks: [
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "What expenses are included in operating expenses?",
        answer: "Operating expenses include utilities, maintenance, insurance, management, marketing, and other day-to-day operational costs, but exclude debt service, taxes, and capital improvements."
      }
    ]
  },
  "outdoor-hospitality": {
    slug: "outdoor-hospitality",
    term: "Outdoor Hospitality",
    definition: "The industry segment encompassing accommodations and experiences in outdoor settings, including glamping resorts, RV parks, campgrounds, and outdoor resorts.",
    extendedDefinition: `Outdoor hospitality is the industry term for accommodations and hospitality experiences that take place in outdoor or natural settings. This includes glamping resorts, RV parks, campgrounds, outdoor resorts, and marinas - properties that combine hospitality services with outdoor recreation and nature experiences.

The outdoor hospitality industry has experienced significant growth as travelers seek unique, experiential accommodations that connect them with nature. This growth has been driven by trends toward experiential travel, interest in outdoor recreation, and the appeal of unique accommodation types.

Sage Outdoor Advisory specializes exclusively in outdoor hospitality, providing feasibility studies and appraisals for glamping resorts, RV parks, campgrounds, and related properties. Our deep industry expertise ensures accurate analysis and valuations for these unique property types.`,
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
      { text: "About Sage", url: "https://sageoutdooradvisory.com/about/" }
    ],
    faqs: [
      {
        question: "What properties are included in outdoor hospitality?",
        answer: "Outdoor hospitality includes glamping resorts, RV parks, campgrounds, outdoor resorts, and marinas - properties that offer accommodations in outdoor settings."
      }
    ]
  }
};

// Helper functions
export function getGlossaryTerm(slug: string): GlossaryTerm | null {
  return glossaryTerms[slug] || null;
}

export function getAllGlossaryTerms(): GlossaryTerm[] {
  return Object.values(glossaryTerms);
}

export function getGlossaryTermsByCategory(category: string): GlossaryTerm[] {
  return Object.values(glossaryTerms).filter(term => term.category === category);
}

export function getRelatedTerms(term: GlossaryTerm): GlossaryTerm[] {
  return term.relatedTerms
    .map(slug => getGlossaryTerm(slug))
    .filter((term): term is GlossaryTerm => term !== null);
}

export function searchGlossaryTerms(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(glossaryTerms).filter(term =>
    term.term.toLowerCase().includes(lowerQuery) ||
    term.definition.toLowerCase().includes(lowerQuery) ||
    term.seoKeywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
  );
}

