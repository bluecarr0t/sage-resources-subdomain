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
      "A developer planning a 30-unit glamping resort in Colorado's mountain region commissions a feasibility study. The study analyzes local tourism data showing 2.3M annual visitors to nearby attractions, identifies 8 competing properties with average 78% occupancy and $285 ADR, projects 65% first-year occupancy growing to 82% by year 3, estimates $1.2M development costs, and forecasts $650K Year 1 revenue growing to $1.1M by Year 5. The study concludes the project is viable with 18% IRR and recommends proceeding, helping secure $800K bank financing based on the comprehensive analysis.",
      "An investor considering a 150-site RV park near Great Smoky Mountains National Park needs a feasibility study. The analysis examines national park visitation (12M+ annually), analyzes 12 competing RV parks within 15 miles showing strong demand (average 75% occupancy), evaluates local zoning and utility requirements ($850K estimated development costs), projects $920K annual revenue at 70% occupancy and $60/night average rate, and identifies seasonal patterns with peak summer occupancy at 95%. The study validates strong market demand and projects positive cash flow by month 8, supporting the investment decision and lender requirements.",
      "A campground feasibility study for a proposed 80-site property assesses seasonal demand patterns by analyzing monthly visitor data from nearby state parks, weather patterns affecting camping season length (March-October with peak June-August), local event calendars driving weekend demand, and competitive pricing analysis. The study projects 55% annual occupancy with summer peaks at 90% and shoulder seasons at 40%, estimates $380K annual revenue, and identifies the need for winter storage income to offset low-season occupancy. This comprehensive demand analysis helps the owner optimize pricing strategy and plan operational expenses to match revenue patterns."
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
        answer: "Our feasibility studies typically take between 4 to 8 weeks, depending on the size and complexity of the property. This timeframe allows us to thoroughly review market data, inspect the property, and prepare a detailed, accurate report. For a more specific timeline based on your project, please contact our team—we're happy to discuss your feasibility study needs."
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
    relatedTerms: ["ardr", "revpar", "occupancy-rate", "revenue-projections", "noi"],
    examples: [
      "A 20-unit glamping resort generates $180K in monthly revenue from 600 occupied unit-nights (20 units × 30 days). ADR = $180K ÷ 600 = $300 per night. During peak season, rates increase to $400/night, while offseason rates drop to $200/night, creating seasonal ADR variations. This $300 ADR helps property managers track pricing effectiveness and compare to competitors averaging $280 ADR in the same market.",
      "An RV park with 80 full hookup sites charges $75/night. In a month with 1,680 occupied site-nights (70% occupancy), total revenue is $126K. ADR = $126K ÷ 1,680 = $75. The park also offers premium waterfront sites at $95/night and basic sites at $55/night. The blended ADR of $75 reflects the mix of site types, helping owners understand their average rate across different offerings and seasons.",
      "A family campground with 50 tent sites charges $45/night. During a summer month with 1,125 occupied site-nights (75% occupancy), revenue totals $50,625. ADR = $50,625 ÷ 1,125 = $45. This ADR is competitive with nearby campgrounds averaging $42-48, demonstrating proper market positioning. By tracking ADR monthly, the owner can identify pricing opportunities and seasonal trends."
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
  "ardr": {
    slug: "ardr",
    term: "ARDR (Average Retail Daily Rate)",
    definition: "The average listing price shown on websites and marketplaces for accommodation units, representing the advertised rate before any discounts or bookings.",
    extendedDefinition: `ARDR, or Average Retail Daily Rate, is a pricing metric that represents the average listed or advertised price for accommodation units across websites and marketplaces. Unlike ADR (Average Daily Rate), which reflects actual revenue earned per occupied unit, ARDR captures the asking price displayed to potential guests before bookings occur.

ARDR is calculated by averaging the listed rates across booking platforms, property websites, and marketplaces. For example, if a glamping resort lists units at $300, $350, and $400 across different dates, the ARDR would be $350.

This metric is valuable for understanding pricing positioning in the marketplace, competitive pricing analysis, and marketing strategy. ARDR helps property owners see how their listed prices compare to market rates and competitors. It's particularly useful for tracking pricing trends on third-party platforms like Airbnb, Booking.com, and VRBO.

In outdoor hospitality, ARDR can differ from actual ADR due to discounts, promotions, last-minute pricing adjustments, or commission structures. Understanding the gap between ARDR and ADR helps property owners optimize pricing strategies and revenue management.

Sage Outdoor Advisory uses ARDR analysis in market research and feasibility studies to help clients understand competitive pricing positioning and optimize their listing strategies across distribution channels.`,
    category: "Financial",
    relatedTerms: ["adr", "revpar", "revenue-projections", "competitive-analysis"],
    examples: [
      "A glamping resort with $350 ARDR listed across booking platforms",
      "Comparing ARDR across competing RV parks on marketplace websites",
      "Tracking ARDR trends to understand market pricing dynamics"
    ],
    useCases: [
      "Competitive pricing analysis",
      "Market positioning assessment",
      "Pricing strategy development",
      "Distribution channel optimization",
      "Marketing strategy planning"
    ],
    seoKeywords: ["ARDR", "average retail daily rate", "listed price", "advertised rate", "marketplace pricing", "booking platform rates"],
    internalLinks: [
      { text: "Market Reports", url: "https://sageoutdooradvisory.com/market-reports/" },
      { text: "Data Insights", url: "https://sageoutdooradvisory.com/data-insights/" },
      { text: "Feasibility Studies", url: "https://sageoutdooradvisory.com/our-services/" }
    ],
    faqs: [
      {
        question: "What's the difference between ARDR and ADR?",
        answer: "ARDR represents the average listed or advertised price on websites and marketplaces, while ADR represents the average actual revenue earned per occupied unit. ARDR is the asking price; ADR is what you actually receive."
      },
      {
        question: "Why is ARDR important for outdoor hospitality properties?",
        answer: "ARDR helps property owners understand their competitive positioning in the marketplace, analyze pricing trends, and optimize listing strategies across different booking platforms and distribution channels."
      },
      {
        question: "How does ARDR differ from the actual price guests pay?",
        answer: "ARDR shows listed prices before discounts, promotions, or last-minute adjustments. The actual price paid may be lower due to special offers, seasonal discounts, or platform-specific promotions."
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
      "A 25-unit glamping resort operates year-round. In January, 450 units are occupied out of 775 available (25 units × 31 days), resulting in 58% occupancy. During peak summer months (June-August), occupancy averages 90% with 2,090 occupied out of 2,325 available units. The annual occupancy rate of 75% (6,825 occupied out of 9,125 available unit-nights) reflects seasonal variations and helps with financial planning. Property managers use this metric to optimize pricing, with higher rates during high-occupancy periods and promotions during slower seasons.",
      "An RV resort in Florida experiences strong seasonality. During snowbird season (November-April), 180 of 200 sites are consistently occupied, achieving 90% occupancy. Summer months (May-October) drop to 60% occupancy (120 of 200 sites). The peak season occupancy of 85% during the best months demonstrates strong demand during prime periods. Understanding this pattern helps owners maximize revenue during high-demand periods and plan maintenance or renovations during slower months.",
      "A year-round campground maintains steady 60% occupancy with minimal seasonal variation. With 50 sites available 365 days, there are 18,250 available site-nights annually. At 60% occupancy, 10,950 site-nights are occupied. This consistent occupancy rate provides predictable cash flow compared to highly seasonal properties. The owner can reliably project annual revenue based on this stable occupancy pattern and plan capital improvements knowing income won't fluctuate dramatically."
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
      "A feasibility study for a new 20-unit glamping resort includes 5-year revenue projections: Year 1 projects $420K revenue at 55% occupancy (4,015 occupied unit-nights) with $105 ADR, growing to Year 5 with $850K revenue at 80% occupancy (5,840 unit-nights) and $145 ADR as the property gains reputation and can command premium rates. These projections help lenders assess loan repayment ability and help investors understand when profitability will be achieved. The projection includes conservative, base, and optimistic scenarios to account for market uncertainty.",
      "An RV park owner creates seasonal revenue projections: Summer months (June-August) generate $280K quarterly with 85% occupancy at $95/night average rate. Spring and fall (March-May, September-November) generate $180K quarterly at 65% occupancy. Winter months (December-February) generate $95K quarterly at 40% occupancy. Total annual revenue projection = $735K. These seasonal projections help with cash flow planning, staffing decisions, and identifying when to schedule capital improvements during slower periods.",
      "A campground expansion project evaluates revenue impact of adding 25 new RV sites: Current revenue is $480K annually from 75 sites. The expansion would add approximately $160K in new revenue (25 sites × $65 average rate × 80% occupancy × 365 days = $474K, but accounting for startup ramp-up, Year 1 projects $160K additional). Combined with existing operations, total projected revenue grows to $640K annually. This revenue projection justifies the $320K expansion cost and helps secure financing by demonstrating increased cash flow potential."
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
      "A glamping resort charges $200/night (ADR) and maintains 80% occupancy. RevPAR = $200 × 0.80 = $160. This means the property generates $160 per available unit, regardless of whether it's occupied. If the resort has 30 units, total potential revenue is $4,800 per night (30 × $160). A competitor with $180 ADR but 90% occupancy has $162 RevPAR, showing higher revenue efficiency. The glamping resort could improve RevPAR by either raising ADR to $225 (if demand supports it) or increasing occupancy through marketing, demonstrating how this single metric combines pricing and demand.",
      "An RV park with $75 ADR and 70% occupancy calculates RevPAR = $75 × 0.70 = $52.50. With 100 sites, this generates $5,250 potential revenue per night across all sites. If occupancy drops to 60% while maintaining $75 ADR, RevPAR falls to $45. Alternatively, if they raise rates to $85 and occupancy stays at 70%, RevPAR increases to $59.50. This metric helps owners understand that increasing occupancy or ADR both improve revenue, and guides decisions about whether to focus on pricing strategy or demand generation.",
      "Comparing two campgrounds: Campground A has $50 ADR and 65% occupancy = $32.50 RevPAR. Campground B has $45 ADR and 80% occupancy = $36 RevPAR. Despite lower ADR, Campground B generates more revenue per available site due to higher occupancy. This RevPAR comparison reveals Campground A might be overpriced (low occupancy) or needs better marketing, while Campground B's strategy of competitive pricing drives better overall performance."
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
      "A glamping resort generates $800K in gross operating income from room revenue. Operating expenses total $500K including: utilities ($95K), property maintenance ($120K), insurance ($35K), management fees ($120K), marketing ($40K), administrative costs ($25K), property taxes ($35K), and other expenses ($30K). NOI = $800K - $500K = $300K. This NOI is then used for property valuation: at an 8% cap rate, the property value = $300K ÷ 0.08 = $3.75M. NOI excludes debt service ($180K) and capital improvements, focusing purely on operational profitability.",
      "An RV park with $1.2M annual revenue incurs $600K in operating expenses: utilities ($180K), maintenance ($150K), property management ($90K), insurance ($45K), marketing ($35K), administrative ($40K), property taxes ($50K), and repairs ($10K). NOI = $1.2M - $600K = $600K. Lenders use this NOI to determine loan capacity: requiring 1.4 DSCR, maximum debt service = $600K ÷ 1.4 = $428K annually, which supports approximately a $4.5M loan at current interest rates. This NOI demonstrates strong operational performance and ability to service debt.",
      "A campground owner analyzes NOI improvement: Current revenue is $650K with $390K operating expenses = $260K NOI. By reducing utilities through efficiency upgrades ($15K savings) and renegotiating management fees ($10K savings), operating expenses drop to $365K. New NOI = $285K, a 9.6% increase. At an 8.5% cap rate, this $25K NOI improvement increases property value by $294K ($25K ÷ 0.085), showing how operational efficiency directly impacts property valuation and investor returns."
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
      "An RV park generates $300K in Net Operating Income. Recent comparable sales and market analysis indicate the property should trade at a 7.5% cap rate based on similar properties. Property value = $300K ÷ 0.075 = $4M. If market cap rates compress to 6.5% (indicating stronger demand and lower perceived risk), the same property would be worth $4.6M ($300K ÷ 0.065), demonstrating how cap rate changes affect property values. Investors use cap rates to quickly assess if a property is priced correctly relative to its income.",
      "A glamping resort appraiser determines the property generates $500K NOI. Researching recent sales of similar glamping properties shows cap rates ranging from 7.5% to 9%, with premium properties in desirable locations at lower cap rates. Applying an 8.3% cap rate (middle of the range) values the property at $6M ($500K ÷ 0.083). A higher cap rate of 9% would value it at $5.56M, while a lower 7.5% cap rate would value it at $6.67M. This cap rate analysis provides a range for negotiations and helps buyers understand expected returns.",
      "Cap rate comparison for investment decisions: Property A is an RV park with $400K NOI priced at $5M = 8% cap rate. Property B is a glamping resort with $450K NOI priced at $5.5M = 8.2% cap rate. While Property B has higher NOI, Property A offers a slightly better cap rate (return on investment). However, the glamping resort might have better appreciation potential or lower risk, which isn't captured in cap rate alone. Cap rate helps normalize properties with different income levels for comparison, but investors must also consider growth potential, location, and risk factors."
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
      "An investor purchases a glamping resort for $2M. After operating expenses and debt service, the property generates $200K in annual net profit. ROI = ($200K ÷ $2M) × 100 = 10% annually. Over 5 years, if the property is sold for $2.5M, the total ROI includes both the $1M in profit from operations ($200K × 5 years) plus the $500K appreciation, totaling $1.5M on a $2M investment = 75% total ROI or 15% annualized. This helps compare to alternative investments like stocks or bonds.",
      "A glamping resort investment analysis: Purchase price is $3.5M with $700K down payment (80% financing). Annual cash flow after all expenses is $105K. ROI on the cash investment = ($105K ÷ $700K) × 100 = 15% cash-on-cash return. However, total ROI including loan paydown and appreciation might be higher. If the property appreciates 3% annually ($105K) and loan principal paydown is $40K, total annual return is $250K on $700K investment = 35.7% ROI, demonstrating how leverage amplifies returns in real estate.",
      "Comparing ROI across investment options: Option A is a $1M all-cash campground purchase generating $80K annual profit = 8% ROI. Option B is a $2M glamping resort with $400K down generating $120K cash flow = 30% cash-on-cash ROI but lower absolute profit. Option C is stocks returning 10% annually. The ROI comparison helps investors choose based on risk tolerance, cash availability, and return expectations, with higher ROI often correlating with higher risk or leverage."
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
      "An appraiser values a glamping resort using the income approach: The property generates $400K in stabilized NOI (after accounting for normal vacancy and operating expenses). Researching recent sales of comparable glamping properties reveals cap rates between 6.5% and 8%, with similar properties trading at 7% cap rate. Using income approach: Property value = NOI ÷ Cap rate = $400K ÷ 0.07 = $5.7M. The appraiser also considers the sales comparison approach ($5.4M) and cost approach ($6.1M), then reconciles to a final value of $5.7M, giving the income approach the most weight since this is an income-producing property. Lenders use this valuation to determine loan amounts and loan-to-value ratios.",
      "An RV park appraisal using income approach: The 120-site property generates $750K annual revenue with $320K operating expenses, resulting in $430K NOI. Market research shows RV parks in this region trade at 7.5-8.5% cap rates, with premium resorts at lower rates. The appraiser selects an 8% cap rate based on property characteristics and comparable sales. Income approach valuation = $430K ÷ 0.08 = $5.375M. This valuation method is most appropriate for income-producing properties like RV parks, as it directly relates value to income-generating ability. The appraisal helps buyers understand fair market value and helps lenders assess collateral value for financing decisions.",
      "A campground owner requests an appraisal before refinancing: The property shows $280K NOI from $650K revenue and $370K operating expenses. The appraiser researches cap rates from recent campground sales in the region, finding a range of 8.5-10% depending on location and amenities. Applying a 9% cap rate based on the property's characteristics, income approach indicates $3.11M value ($280K ÷ 0.09). However, the appraiser also notes potential NOI improvement opportunities (energy efficiency, rate optimization) that could increase value to $3.5M if implemented, providing both current and prospective value for the refinancing analysis."
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
      "A glamping resort owner wants to sell and needs to determine fair market value. Using DCF analysis, they project annual cash flows: Years 1-3 show $250K, $320K, $380K as occupancy builds, then stabilize at $450K annually for years 4-10. Discounting these future cash flows at 12% (reflecting risk), plus a terminal value, results in a present value of $3.2M - providing a data-driven valuation for sale negotiations.",
      "An investor evaluating a new campground development uses DCF to assess project viability. The 10-year projection shows initial negative cash flows during construction and startup ($-200K, $-50K), then positive cash flows growing from $180K in Year 3 to $420K in Year 10. Using a 15% discount rate (higher risk for new development), the DCF analysis shows the project creates value only if initial investment stays below $2.1M, helping inform the go/no-go decision.",
      "A feasibility study uses DCF analysis to compare two RV park expansion options: Option A requires $500K investment, generates $120K annual cash flow. Option B requires $800K, generates $200K annually. DCF analysis reveals Option B has a higher net present value despite larger investment, because the incremental $80K annual return on the additional $300K investment exceeds the discount rate, making it the better financial choice."
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
      "An investor purchases a glamping resort for $2.5M with $500K down payment and finances $2M. Over 10 years, they receive annual cash flows starting at $180K and growing to $320K, plus they sell the property for $4.2M at the end. The IRR calculation shows this investment generates an 18% annualized return, accounting for the timing of all cash flows. This IRR exceeds their 12% required return, making it an attractive investment.",
      "An investor comparing two RV park opportunities: Property A costs $3M, generates steady $360K annual cash flow for 7 years, then sells for $4.5M - resulting in 16% IRR. Property B costs $2.2M, starts with $200K cash flow but grows to $420K, sells for $3.8M in 10 years - resulting in 19% IRR. Despite Property A having higher absolute returns, Property B's higher IRR indicates better return efficiency per dollar invested.",
      "A developer evaluating a campground project with initial $1.5M investment: Years 1-2 show negative cash flows (-$100K, -$30K) during startup, then positive cash flows of $180K-350K for years 3-10, with a $2.4M sale at year 10. The IRR calculation shows 17% annualized return, which accounts for the delayed positive returns and helps compare this longer-term investment to faster-return alternatives."
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
      "An investor puts $500K down on a $2.5M glamping resort (80% LTV financing). After debt service of $120K on the $2M loan, they receive $60K in annual cash flow. Cash-on-cash return = $60K ÷ $500K = 12%. This shows their actual return on the cash invested, which is more relevant than total property ROI when using leverage. A 12% cash-on-cash return beats many alternative investments while building equity through loan paydown.",
      "Comparing financing scenarios for an RV park purchase: Option A uses 70% LTV ($1.4M loan on $2M property), requires $600K down, generates $45K cash flow after debt = 7.5% cash-on-cash. Option B uses 75% LTV ($1.5M loan), requires $500K down, generates $42K cash flow = 8.4% cash-on-cash. Option B is better despite lower absolute cash flow because it requires less cash invested, demonstrating leverage's impact on returns.",
      "A campground investor analyzes a potential acquisition: $800K down payment on a $3M property with $2.2M financing. After covering $175K annual debt service, remaining cash flow is $85K. Cash-on-cash return of 10.6% ($85K/$800K) helps them compare to other investment options and assess whether the leverage strategy makes sense compared to an all-cash purchase that might yield 8% total return."
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
      "A glamping resort generates $500K annual revenue with $200K operating expenses, resulting in $300K NOI. The property has annual debt service (principal + interest) of $200K. DSCR = $300K ÷ $200K = 1.5. This means the property generates 50% more income than required for debt payments, providing a safety cushion. Most lenders require at least 1.25-1.5 DSCR, so this property meets financing requirements and shows strong ability to service debt even with seasonal fluctuations.",
      "An RV park with $850K NOI applies for a $5M loan with $420K annual debt service. DSCR = $850K ÷ $420K = 2.02. This strong 2.0+ DSCR position means the property could still cover debt payments even if income dropped by 50%, making it very attractive to lenders who may offer better interest rates or terms due to lower perceived risk.",
      "A campground seeking refinancing: Current NOI is $280K, but debt service on a new $2.2M loan would be $240K annually. DSCR = $280K ÷ $240K = 1.17, which is below the lender's 1.25 minimum requirement. The borrower must either increase NOI (raise rates, improve occupancy), reduce loan amount, or accept less favorable terms. This demonstrates why DSCR analysis is critical before applying for financing."
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
      "A developer planning a 25-unit glamping resort creates a 5-year pro forma showing: Year 1 projects $450K revenue at 60% occupancy, growing to $850K by Year 5 at 80% occupancy. Operating expenses start at $180K and increase to $300K as the property scales. This pro forma helps secure financing by demonstrating expected cash flow and profitability trajectory.",
      "An investor evaluating an RV park acquisition uses pro forma projections to estimate performance: Based on market research, the 100-site park could generate $750K annual revenue with $350K operating expenses, resulting in $400K NOI. The pro forma includes 3 scenarios (conservative, base, optimistic) to show different outcomes based on occupancy and rate assumptions.",
      "A campground expansion project includes pro forma financials showing how adding 30 new RV sites would impact revenue. The pro forma projects construction costs of $450K, new revenue of $180K annually, and additional operating expenses of $45K, demonstrating a positive ROI and payback period to justify the investment."
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
      "A glamping resort generates $800K in revenue, has $200K in operating expenses (utilities, maintenance, insurance), and $100K in depreciation. EBITDA = $800K - $200K = $600K, showing operating profitability excluding financing and accounting decisions. This helps compare operational performance across properties regardless of financing structure.",
      "An investor comparing two RV park acquisitions: Property A shows $400K EBITDA while Property B shows $350K EBITDA. Despite Property A having higher interest payments due to larger debt, EBITDA reveals it has better operational profitability. Property A's EBITDA margin (EBITDA/revenue) of 40% vs Property B's 35% indicates more efficient operations.",
      "A feasibility study for a new campground project projects $500K in revenue with $180K in operating expenses and $50K in depreciation. The projected EBITDA of $320K helps lenders evaluate the property's core operating performance and ability to service debt, separate from tax benefits or financing structure."
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
    definition: "A commercial outdoor accommodation destination featuring standalone glamping units with bedding and linens, ranging from budget-friendly to ultra-luxury, typically located in scenic natural settings.",
    extendedDefinition: `A glamping resort is a commercial outdoor hospitality property that offers standalone glamping accommodations, typically featuring multiple glamping units such as safari tents, yurts, treehouses, Airstream trailers, or other unique structures. Each unit is a complete, standalone accommodation with its own bedding and linens.

Glamping resorts span a wide quality and price spectrum, from budget-friendly options with basic amenities to ultra-luxury properties with premium features. Budget-friendly glamping resorts may offer simple but comfortable units with basic bedding, while ultra-luxury resorts provide high-end amenities like private bathrooms, premium linens, heating and cooling, hot tubs, gourmet kitchens, and concierge services.

Unlike basic campgrounds that require guests to bring their own equipment, glamping resorts provide fully furnished units that are ready for occupancy. Many glamping resorts also include on-site services like restaurants, activities, and guest services to enhance the experience.

Glamping resorts appeal to travelers who want to connect with nature without sacrificing comfort, and they typically command rates between traditional camping and hotel accommodations, varying based on the quality level and amenities offered.

Sage Outdoor Advisory provides feasibility studies and appraisals specifically for glamping resorts across all price points, understanding the unique market dynamics, revenue models, and operational considerations of these properties.`,
    category: "Glamping",
    relatedTerms: ["glamping", "safari-tent", "yurt", "adr", "occupancy-rate"],
    examples: [
      "A budget-friendly glamping resort offering 15 basic yurts with queen beds, linens, and simple furnishings at $75-100/night, providing comfortable standalone accommodations without luxury amenities",
      "A mid-range 25-unit glamping resort in the mountains featuring safari tents and treehouses with private bathrooms, quality bedding, heating/cooling, and basic kitchenettes at $150-200/night",
      "An ultra-luxury coastal glamping resort with 12 premium Airstream trailers featuring high-end linens, private hot tubs, gourmet kitchens, concierge service, and premium amenities at $400-600/night"
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
        answer: "Glamping resorts provide standalone, fully furnished units with bedding and linens already included, so guests don't need to bring their own equipment. While glamping resorts range from budget-friendly to ultra-luxury, all offer ready-to-use accommodations. Campgrounds typically require guests to bring their own tents, RVs, or equipment, and facilities like restrooms and showers are usually shared rather than private to each unit."
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
      "A 30-unit glamping resort tracks operating expenses: Utilities (electric, water, sewer) = $45K annually, property insurance = $25K, maintenance and repairs = $60K, property management fees (15% of revenue) = $75K on $500K revenue, marketing and advertising = $20K, administrative costs = $15K. Total operating expenses = $240K. These represent 48% of revenue, which is within the typical 30-50% range for outdoor hospitality. Understanding these expenses helps project NOI and property value.",
      "An RV park owner analyzes operating expenses: With 100 sites generating $750K annual revenue, operating expenses total $300K including: utilities ($85K), property maintenance ($75K), landscaping and groundskeeping ($40K), management fees ($60K), insurance ($25K), and administrative ($15K). The 40% expense ratio leaves $450K NOI. By benchmarking against industry standards, the owner identifies that utilities are high and could invest in efficiency improvements to reduce costs and increase NOI.",
      "Operating expense tracking for a campground: Monthly expenses include $3,500 utilities, $4,200 maintenance, $2,800 management, $1,500 insurance, $1,200 marketing = $13,200 monthly or $158K annually. On $420K revenue, this 38% expense ratio is efficient. These operating expenses are critical for calculating NOI ($420K - $158K = $262K), which is then used for property valuation using the income approach (NOI ÷ cap rate = value)."
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

