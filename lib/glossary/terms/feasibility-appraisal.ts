import type { GlossaryTerm } from "../types";

const HERO = {
  feasibility:
    "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/a-frame-cabin-1.jpg",
  appraisal:
    "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/guides/property-appraisals-complete-guide-hero.webp",
  market:
    "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/forest-scene.jpg",
  competitive:
    "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/safari-tent.jpg",
  revenue:
    "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/cabin.jpg",
  income:
    "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/yurt.jpg",
  comps: "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/treehouse.jpg",
  cost: "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/canvas-tent.jpg",
} as const;

export const feasibilityAppraisalTerms: Record<string, GlossaryTerm> = {
  "feasibility-study": {
    slug: "feasibility-study",
    term: "Feasibility Study",
    image: HERO.feasibility,
    definition:
      "A comprehensive analysis that evaluates the viability, market potential, and financial prospects of a proposed outdoor hospitality project, such as a glamping resort, RV park, or campground.",
    extendedDefinition: `A feasibility study is a critical business analysis tool used in the outdoor hospitality industry to determine whether a proposed project is viable, profitable, and worth pursuing. For glamping resorts, RV parks, and campgrounds, a feasibility study examines market demand, competition, financial projections, site suitability, regulatory requirements, and risk.

The study typically includes market analysis, competitive assessment, revenue and expense forecasts, site evaluation, and strategic recommendations. Lenders often require a bank-approved feasibility study before financing development or acquisition.

Sage Outdoor Advisory has completed more than 350 feasibility studies and appraisals for outdoor hospitality assets nationwide. Our bank-approved reports help investors, developers, and lenders make confident go/no-go decisions. For a deeper walkthrough of the process, see our <a href="/guides/feasibility-studies-complete-guide">complete guide to feasibility studies</a>. For industry context, read the <a href="https://sageoutdooradvisory.com/blog/2025-outdoor-hospitality-industry-overview/">Outdoor Hospitality Industry Overview</a> on the Sage blog.
`,
    category: "Feasibility & Appraisal",
    relatedTerms: [
      "market-analysis",
      "appraisal",
      "revenue-projections",
      "competitive-analysis",
      "zoning",
      "permitting",
      "site-development",
      "due-diligence",
    ],
    examples: [
      "A developer planning a 30-unit glamping resort in Colorado's mountain region commissions a feasibility study. The study analyzes local tourism data showing 2.3M annual visitors to nearby attractions, identifies 8 competing properties with average 78% occupancy and $285 ADR, projects 65% first-year occupancy growing to 82% by year 3, estimates $1.2M development costs, and forecasts $650K Year 1 revenue growing to $1.1M by Year 5. The study concludes the project is viable with 18% IRR and recommends proceeding, helping secure $800K bank financing based on the comprehensive analysis.",
      "An investor considering a 150-site RV park near Great Smoky Mountains National Park needs a feasibility study. The analysis examines national park visitation (12M+ annually), analyzes 12 competing RV parks within 15 miles showing strong demand (average 75% occupancy), evaluates local zoning and utility requirements ($850K estimated development costs), projects $920K annual revenue at 70% occupancy and $60/night average rate, and identifies seasonal patterns with peak summer occupancy at 95%. The study validates strong market demand and projects positive cash flow by month 8, supporting the investment decision and lender requirements.",
      "A campground feasibility study for a proposed 80-site property assesses seasonal demand patterns by analyzing monthly visitor data from nearby state parks, weather patterns affecting camping season length (March-October with peak June-August), local event calendars driving weekend demand, and competitive pricing analysis. The study projects 55% annual occupancy with summer peaks at 90% and shoulder seasons at 40%, estimates $380K annual revenue, and identifies the need for winter storage income to offset low-season occupancy. This comprehensive demand analysis helps the owner optimize pricing strategy and plan operational expenses to match revenue patterns.",
    ],
    useCases: [
      "Securing bank financing for development projects",
      "Evaluating investment opportunities",
      "Making go/no-go decisions on projects",
      "Understanding market potential before purchase",
    ],
    seoKeywords: [
      "feasibility study",
      "feasibility analysis",
      "project feasibility",
      "business feasibility",
      "feasibility report",
    ],
    internalLinks: [
      { text: "Feasibility Studies Complete Guide", url: "/guides/feasibility-studies-complete-guide" },
      { text: "Glamping Feasibility Study", url: "/landing/glamping-feasibility-study" },
      { text: "RV Resort Feasibility Study", url: "/landing/rv-resort-feasibility-study" },
      { text: "Campground Feasibility Study", url: "/landing/campground-feasibility-study" },
      { text: "Feasibility Study Services", url: "https://sageoutdooradvisory.com/services-overview/" },
    ],
    faqs: [
      {
        question: "How long does a feasibility study take?",
        answer:
          "Most outdoor hospitality feasibility studies take about six to eight weeks, depending on property size, market complexity, and scope. That timeline allows for market research, financial modeling, and a lender-ready report. See our feasibility study process timeline guide or contact Sage for a schedule tailored to your glamping, RV, or campground project.",
      },
      {
        question: "What's included in a feasibility study?",
        answer:
          "A bank-ready feasibility study typically includes market and competitive analysis, occupancy and rate assumptions, operating expense forecasts, development or acquisition costs, multi-year pro forma financials, and risk discussion. Sage studies are built specifically for glamping resorts, RV parks, and campgrounds—not generic hotel templates.",
      },
      {
        question: "Do banks accept feasibility studies?",
        answer:
          "Yes. Lenders routinely require third-party feasibility studies for outdoor hospitality development and acquisition loans. Sage Outdoor Advisory prepares bank-approved studies trusted by financial institutions; see our <a href=\"/guides/feasibility-studies-complete-guide\">feasibility studies guide</a> for what lenders expect.",
      },
    ],
  },
  appraisal: {
    slug: "appraisal",
    term: "Appraisal",
    image: HERO.appraisal,
    definition:
      "A professional assessment of a property's value conducted by a certified appraiser, used for financing, sales, insurance, and investment decisions in the outdoor hospitality industry.",
    disambiguation: {
      heading: "Property appraisal for outdoor hospitality—not other “appraisals”",
      body: `<p>Here, <strong>appraisal</strong> means a <strong>real property valuation</strong> by a licensed appraiser—typically for a glamping resort, RV park, or campground. Searchers sometimes mean:</p>
      <ul class="list-disc list-inside space-y-2 ml-4">
        <li><strong>Home appraisal</strong> (single-family residential)</li>
        <li><strong>Personal property appraisal</strong> (art, antiques, equipment)</li>
        <li><strong>Performance appraisal</strong> (HR / employee reviews)</li>
      </ul>
      <p>Outdoor hospitality appraisals weight <a href="/glossary/income-approach">income approach</a> methods, unit-level revenue, and limited comp pools—see our <a href="/guides/property-appraisals-complete-guide">property appraisals guide</a> and <a href="/landing/glamping-appraisal">glamping appraisal services</a>.</p>`,
    },
    extendedDefinition: `An appraisal is a formal, unbiased opinion of a property's market value prepared by a licensed or certified appraiser. For glamping resorts, RV parks, campgrounds, and outdoor resorts, appraisals support lending, acquisitions, refinances, insurance, and internal investment decisions.

Appraisers typically use three approaches: sales comparison (recent comparable sales), income (NOI divided by cap rate), and cost (replacement cost minus depreciation plus land). Income-producing outdoor hospitality assets often rely heavily on the income approach because value is tied to stabilized cash flow.

Specialized outdoor hospitality appraisals account for unit mix, seasonality, franchise or management agreements, and limited comp pools. Generic residential or commercial appraisals can misstate value and create financing delays.

Sage Outdoor Advisory provides appraisals designed for glamping, RV, and campground assets, with documentation lenders and investors expect. Learn more in our <a href="/guides/property-appraisals-complete-guide">property appraisals complete guide</a>, or <a href="https://sageoutdooradvisory.com/contact-us/">schedule a consultation</a> to discuss your property.
`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["feasibility-study", "cap-rate", "noi", "income-approach", "zoning", "due-diligence"],
    examples: [
      "A 22-unit glamping resort near Asheville, NC, is appraised for a refinance. The appraiser analyzes three years of operating history ($520K revenue, $198K NOI), reviews four regional glamping sales, and applies a 7.25% cap rate to stabilized NOI, supporting a value of $2.73M that satisfies the lender's 65% LTV requirement.",
      "An RV park sale in Florida requires an appraisal for the buyer's SBA loan. The 95-site park shows 72% annual occupancy and $68 ADR. The income approach yields $4.1M; sales comparison with two recent park trades supports $3.95M–$4.2M. The appraiser reconciles to $4.05M as fair market value.",
      "A campground owner requests an appraisal before listing. The appraiser documents 60 sites, utility infrastructure, and $310K NOI, then cross-checks income and sales approaches. The report gives the owner a defensible list price and helps buyers underwrite debt service.",
    ],
    useCases: [
      "Securing bank loans and financing",
      "Property sales and acquisitions",
      "Refinancing existing properties",
      "Insurance valuation",
      "Investment analysis",
    ],
    seoKeywords: ["property appraisal", "real estate appraisal", "business appraisal", "valuation", "appraised value"],
    internalLinks: [
      { text: "Property Appraisals Complete Guide", url: "/guides/property-appraisals-complete-guide" },
      { text: "Glamping Appraisal", url: "/landing/glamping-appraisal" },
      { text: "RV Resort Appraisal", url: "/landing/rv-resort-appraisal" },
      { text: "Appraisal Services", url: "https://sageoutdooradvisory.com/services-overview/" },
      { text: "RV Park Appraisal Services", url: "https://sageoutdooradvisory.com/appraisal-rv-parks/" },
    ],
    faqs: [
      {
        question: "How long does an outdoor hospitality appraisal take?",
        answer:
          "Most specialized appraisals take about two to four weeks after site access and financial records are provided. Complex resorts or limited comparable sales can take longer. Contact Sage Outdoor Advisory for a timeline based on your property type and lender requirements.",
      },
      {
        question: "Why do I need a specialized appraiser for outdoor hospitality?",
        answer:
          "Glamping, RV, and campground properties have unique revenue models, seasonality, and unit mixes. Appraisers without outdoor hospitality experience may misapply cap rates or miss comparable sales. Sage focuses exclusively on these asset classes.",
      },
      {
        question: "What's the difference between an appraisal and a feasibility study?",
        answer:
          "A feasibility study tests whether a proposed or expanding project can succeed financially—often before you build. An appraisal estimates current market value for an existing or permitted property. Many deals require both. See our <a href=\"/guides/feasibility-studies-complete-guide\">feasibility guide</a> and <a href=\"/guides/property-appraisals-complete-guide\">appraisal guide</a> for details.",
      },
    ],
  },
  "market-analysis": {
    slug: "market-analysis",
    term: "Market Analysis",
    image: HERO.market,
    definition:
      "A comprehensive evaluation of market conditions, demand, competition, and trends that informs business decisions for outdoor hospitality projects.",
    extendedDefinition: `Market analysis evaluates whether a location and concept can support a viable outdoor hospitality business. It combines visitor demand, competitive supply, pricing, demographics, and growth trends to inform development, expansion, and investment decisions.

Strong market analysis for glamping, RV parks, and campgrounds goes beyond population counts. It incorporates tourism flows, drive-time markets, online listing performance, seasonal patterns, and planned competitors. Results feed directly into occupancy assumptions, ADR targets, and lender presentations.

Market analysis is a core section of every Sage feasibility study. We benchmark against proprietary outdoor hospitality data from hundreds of completed engagements so projections reflect how these assets actually perform—not generic lodging averages.

Pair market analysis with our <a href="/guides/feasibility-studies-complete-guide">feasibility studies guide</a> or explore <a href="https://sageoutdooradvisory.com/shop/">market reports</a> for regional benchmarks.
`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["feasibility-study", "competitive-analysis", "revenue-projections", "occupancy-rate"],
    examples: [
      "A market analysis for a proposed glamping resort outside Moab, UT, maps national park visitation, identifies 11 competing glamping and RV properties within 30 miles, and models drive-time demand from Salt Lake City and Denver. Findings support 68% stabilized occupancy at $240 ADR in base case.",
      "An RV park expansion in coastal Oregon uses market analysis to test whether 40 new full-hookup sites can be absorbed. Forward booking data, competitor occupancy, and marina tourism statistics suggest sufficient demand if the park adds premium waterfront sites.",
      "A campground investor reviews market analysis showing saturating tent/RV supply near a state park but undersupplied glamping units. The report recommends a phased glamping add instead of more traditional sites.",
    ],
    useCases: [
      "Feasibility studies",
      "Investment analysis",
      "Competitive positioning",
      "Pricing strategy development",
    ],
    seoKeywords: ["market analysis", "market research", "market assessment", "market evaluation", "demand analysis"],
    internalLinks: [
      { text: "Feasibility Studies Complete Guide", url: "/guides/feasibility-studies-complete-guide" },
      { text: "Feasibility Study Services", url: "https://sageoutdooradvisory.com/services-overview/" },
      { text: "Market Reports", url: "https://sageoutdooradvisory.com/shop/" },
    ],
    faqs: [
      {
        question: "What's included in a market analysis?",
        answer:
          "Typical components include demand drivers (tourism, recreation, events), competitive inventory and pricing, seasonality, target customer profiles, and implications for occupancy and rate. In a Sage feasibility study, market analysis is integrated with financial projections—not delivered as a standalone summary.",
      },
      {
        question: "How long does a market analysis take?",
        answer:
          "As part of a full feasibility study, market analysis usually spans several weeks within a four- to eight-week overall timeline. Standalone market assessments may be faster depending on geography and data availability.",
      },
      {
        question: "How is market analysis different from competitive analysis?",
        answer:
          "Market analysis measures overall demand and conditions in a trade area. Competitive analysis focuses on specific rival properties, their positioning, and how your project would compete. Both are essential and appear in Sage feasibility studies.",
      },
    ],
  },
  "competitive-analysis": {
    slug: "competitive-analysis",
    term: "Competitive Analysis",
    image: HERO.competitive,
    definition:
      "An assessment of competing properties and businesses in the market to understand competitive positioning, pricing, and market share.",
    extendedDefinition: `Competitive analysis maps the properties and alternatives that will compete for your guests. For outdoor hospitality, that includes direct competitors (other glamping resorts, RV parks, campgrounds) and indirect options (hotels, vacation rentals, public lands camping).

An effective competitive analysis documents unit types, amenities, published rates, estimated occupancy, guest reviews, and differentiation. It reveals gaps—such as underserved luxury segments or weak shoulder-season programming—that your project can capture.

Sage Outdoor Advisory benchmarks competitors using field research, OTA data, and our database of outdoor hospitality properties. That evidence supports realistic ADR and occupancy assumptions in feasibility studies and equips operators with a clear positioning strategy.

See how competitive analysis fits into planning in our <a href="/guides/feasibility-studies-complete-guide">feasibility studies guide</a>, or use our <a href="/map">interactive glamping map</a> to explore competitors by market.
`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["market-analysis", "feasibility-study", "revenue-projections", "adr"],
    examples: [
      "A competitive analysis for a new glamping resort in Vermont profiles eight regional competitors, compares ADR ($175–$425), notes limited winter operations among rivals, and recommends heated units and packages to win shoulder-season demand.",
      "An RV park feasibility study inventories 14 parks within 20 miles, classifies sites by hookup level, and shows the subject can charge a $12/night premium for pull-through sites based on competitor scarcity.",
      "A campground expansion compares county park campground pricing and private RV parks, concluding that adding full-hookup sites—not tent loops—captures the highest unmet demand.",
    ],
    useCases: ["Feasibility studies", "Pricing strategy", "Market positioning", "Investment analysis"],
    seoKeywords: ["competitive analysis", "competitor analysis", "market competition", "competitive landscape"],
    internalLinks: [
      { text: "Feasibility Studies Complete Guide", url: "/guides/feasibility-studies-complete-guide" },
      { text: "Glamping Properties Map", url: "/map" },
      { text: "Feasibility Study Services", url: "https://sageoutdooradvisory.com/services-overview/" },
    ],
    faqs: [
      {
        question: "Why is competitive analysis important?",
        answer:
          "It shows where your project fits in the market, what rates are achievable, and whether supply is saturated. Lenders and investors expect documented competitor review—not assumptions—before funding outdoor hospitality deals.",
      },
      {
        question: "How many competitors should be analyzed?",
        answer:
          "Most Sage studies analyze every material competitor within the primary drive-time market, often 8–20 properties depending on density. Rural markets may include a wider radius; urban markets focus on the nearest substitutes.",
      },
      {
        question: "Can competitive analysis help with pricing?",
        answer:
          "Yes. By comparing unit types, amenities, and published rates, competitive analysis informs ADR targets, package design, and seasonal discounts. It pairs with <a href=\"/glossary/revenue-projections\">revenue projections</a> in a feasibility study.",
      },
    ],
  },
  "revenue-projections": {
    slug: "revenue-projections",
    term: "Revenue Projections",
    image: HERO.revenue,
    definition:
      "Forecasted income estimates for a property based on occupancy rates, average daily rates, and other revenue sources over a specific time period.",
    extendedDefinition: `Revenue projections estimate how much income a glamping resort, RV park, or campground will generate over time. They combine occupancy assumptions, ADR or site rates, ancillary revenue (activities, retail, events), and seasonality into monthly or annual forecasts.

Feasibility studies usually model five to ten years with base, upside, and downside cases. Lenders scrutinize whether occupancy ramps, rate growth, and ancillary income are supported by market and competitive analysis.

Sage revenue projections tie directly to our market research and benchmark data from 350+ outdoor hospitality engagements. That linkage makes forecasts defensible in loan committees and investor meetings.

Understand the inputs in our <a href="/glossary/adr">ADR</a> and <a href="/glossary/occupancy-rate">occupancy rate</a> glossary entries, or start a <a href="/landing/glamping-feasibility-study">glamping feasibility study</a> engagement.
`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["adr", "occupancy-rate", "revpar", "feasibility-study", "noi"],
    examples: [
      "A feasibility study for a new 20-unit glamping resort includes 5-year revenue projections: Year 1 projects $420K revenue at 55% occupancy (4,015 occupied unit-nights) with $105 ADR, growing to Year 5 with $850K revenue at 80% occupancy (5,840 unit-nights) and $145 ADR as the property gains reputation and can command premium rates. These projections help lenders assess loan repayment ability and help investors understand when profitability will be achieved. The projection includes conservative, base, and optimistic scenarios to account for market uncertainty.",
      "An RV park owner creates seasonal revenue projections: Summer months (June-August) generate $280K quarterly with 85% occupancy at $95/night average rate. Spring and fall (March-May, September-November) generate $180K quarterly at 65% occupancy. Winter months (December-February) generate $95K quarterly at 40% occupancy. Total annual revenue projection = $735K. These seasonal projections help with cash flow planning, staffing decisions, and identifying when to schedule capital improvements during slower periods.",
      "A campground expansion project evaluates revenue impact of adding 25 new RV sites: Current revenue is $480K annually from 75 sites. The expansion would add approximately $160K in new revenue (25 sites × $65 average rate × 80% occupancy × 365 days = $474K, but accounting for startup ramp-up, Year 1 projects $160K additional). Combined with existing operations, total projected revenue grows to $640K annually. This revenue projection justifies the $320K expansion cost and helps secure financing by demonstrating increased cash flow potential.",
    ],
    useCases: ["Feasibility studies", "Financial planning", "Loan applications", "Investment analysis"],
    seoKeywords: ["revenue projections", "revenue forecast", "income projections", "revenue estimates"],
    internalLinks: [
      { text: "Feasibility Studies Complete Guide", url: "/guides/feasibility-studies-complete-guide" },
      { text: "Market Reports", url: "https://sageoutdooradvisory.com/shop/" },
      { text: "Glamping Feasibility Study", url: "/landing/glamping-feasibility-study" },
    ],
    faqs: [
      {
        question: "How accurate are revenue projections?",
        answer:
          "Projections are estimates grounded in market data, competitor benchmarks, and operating assumptions. Accuracy improves when they are built inside a full feasibility study with documented demand and pricing evidence—not spreadsheet guesses.",
      },
      {
        question: "What time period do revenue projections cover?",
        answer:
          "Feasibility studies typically forecast five to ten years, with year-by-year occupancy, ADR, and total revenue. Monthly seasonality may be shown for the first two operating years to illustrate cash flow timing.",
      },
      {
        question: "What revenue streams should be included?",
        answer:
          "Include lodging revenue by unit type, seasonal RV or tent sites, retail, activities, event fees, and other on-site income. Sage models ancillary revenue separately when it materially affects lender coverage ratios.",
      },
    ],
  },
  "income-approach": {
    slug: "income-approach",
    term: "Income Approach",
    image: HERO.income,
    definition:
      "A property valuation method that determines value based on the property's income-generating potential, typically using NOI and cap rate.",
    extendedDefinition: `The income approach values a property based on its ability to generate net operating income (NOI). The common formula is Value = NOI ÷ Cap Rate, applied to stabilized income after normalizing expenses and vacancy.

For glamping resorts, RV parks, and campgrounds, the income approach is often the primary appraisal method because buyers and lenders think in terms of cash flow. Appraisers must select cap rates supported by comparable sales and adjust NOI for non-recurring items or owner-specific expenses.

The income approach works alongside sales comparison and cost approaches. Sage reconciles all three in outdoor hospitality appraisals so clients—and lenders—receive a well-supported value conclusion.

Review <a href="/glossary/noi">NOI</a> and <a href="/glossary/cap-rate">cap rate</a> definitions, or read our <a href="/guides/property-appraisals-complete-guide">property appraisals complete guide</a>.
`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["appraisal", "noi", "cap-rate", "dcf"],
    examples: [
      "An appraiser values a glamping resort using the income approach: The property generates $400K in stabilized NOI (after accounting for normal vacancy and operating expenses). Researching recent sales of comparable glamping properties reveals cap rates between 6.5% and 8%, with similar properties trading at 7% cap rate. Using income approach: Property value = NOI ÷ Cap rate = $400K ÷ 0.07 = $5.7M. The appraiser also considers the sales comparison approach ($5.4M) and cost approach ($6.1M), then reconciles to a final value of $5.7M, giving the income approach the most weight since this is an income-producing property. Lenders use this valuation to determine loan amounts and loan-to-value ratios.",
      "An RV park appraisal using income approach: The 120-site property generates $750K annual revenue with $320K operating expenses, resulting in $430K NOI. Market research shows RV parks in this region trade at 7.5-8.5% cap rates, with premium resorts at lower rates. The appraiser selects an 8% cap rate based on property characteristics and comparable sales. Income approach valuation = $430K ÷ 0.08 = $5.375M. This valuation method is most appropriate for income-producing properties like RV parks, as it directly relates value to income-generating ability. The appraisal helps buyers understand fair market value and helps lenders assess collateral value for financing decisions.",
      "A campground owner requests an appraisal before refinancing: The property shows $280K NOI from $650K revenue and $370K operating expenses. The appraiser researches cap rates from recent campground sales in the region, finding a range of 8.5-10% depending on location and amenities. Applying a 9% cap rate based on the property's characteristics, income approach indicates $3.11M value ($280K ÷ 0.09). However, the appraiser also notes potential NOI improvement opportunities (energy efficiency, rate optimization) that could increase value to $3.5M if implemented, providing both current and prospective value for the refinancing analysis.",
    ],
    useCases: ["Property appraisals", "Investment analysis", "Purchase decisions", "Loan underwriting"],
    seoKeywords: ["income approach", "income valuation", "property valuation", "income method"],
    internalLinks: [
      { text: "Property Appraisals Complete Guide", url: "/guides/property-appraisals-complete-guide" },
      { text: "Appraisal Services", url: "https://sageoutdooradvisory.com/services-overview/" },
      { text: "NOI (Net Operating Income)", url: "/glossary/noi" },
    ],
    faqs: [
      {
        question: "When is the income approach used?",
        answer:
          "It is the default method for stabilized glamping, RV, and campground properties with reliable operating history. Development sites may rely more on cost or sales approaches until income stabilizes.",
      },
      {
        question: "How does the income approach differ from other valuation methods?",
        answer:
          "The income approach uses NOI and cap rates; the sales comparison approach adjusts recent sales of similar properties; the cost approach estimates replacement cost minus depreciation plus land. Sage appraisals reconcile all applicable methods.",
      },
      {
        question: "What cap rate should I use?",
        answer:
          "Cap rates vary by asset type, location, and risk. They should come from comparable outdoor hospitality sales—not office or apartment benchmarks. Sage market reports and appraisals document market-derived cap rates for your region.",
      },
    ],
  },
  "comparable-sales": {
    slug: "comparable-sales",
    term: "Comparable Sales",
    image: HERO.comps,
    definition:
      "Similar properties that have recently sold, used as benchmarks to determine a property's market value in the sales comparison approach.",
    extendedDefinition: `Comparable sales—or "comps"—are recent transactions of properties similar to the subject in location, size, amenities, and income profile. Appraisers use comps in the sales comparison approach, making adjustments for differences in acreage, unit count, condition, and NOI.

Outdoor hospitality comps can be scarce. Sage maintains awareness of glamping, RV park, and campground trades nationwide so appraisals reflect real market evidence—not generic land sales.

When comps are limited, appraisers weight the income approach more heavily but still document any relevant sales. Transparent comp selection builds lender confidence.

Learn how comps interact with other methods in our <a href="/guides/property-appraisals-complete-guide">property appraisals complete guide</a>.`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["appraisal", "market-analysis", "income-approach"],
    examples: [
      "An appraiser valuing a 15-unit glamping resort identifies three regional sales from the past 18 months, adjusts for fewer units and inferior road access, and supports a value range of $2.8M–$3.1M before reconciliation with the income approach.",
      "An RV park acquisition uses five park sales within 100 miles. Adjustments account for coastal versus inland location and percentage of pull-through sites, yielding a sales-comparison indication of $4.2M versus $4.0M from income.",
      "A campground appraisal cites two nearby park sales plus a glamping resort trade, explaining why blended hospitality comps require larger adjustments than standard multifamily comps.",
    ],
    useCases: ["Property appraisals", "Purchase price determination", "Market value assessment"],
    seoKeywords: ["comparable sales", "comps", "comparable properties", "sales comparison"],
    internalLinks: [
      { text: "Property Appraisals Complete Guide", url: "/guides/property-appraisals-complete-guide" },
      { text: "Appraisal Services", url: "https://sageoutdooradvisory.com/services-overview/" },
      { text: "Income Approach", url: "/glossary/income-approach" },
    ],
    faqs: [
      {
        question: "How many comparable sales are needed?",
        answer:
          "Appraisers prefer three to five relevant sales when available. In thin markets, fewer comps may be used with broader adjustments and heavier reliance on the income approach.",
      },
      {
        question: "Why are outdoor hospitality comps hard to find?",
        answer:
          "Transactions are less frequent than residential housing, and each property differs in unit mix and amenities. Specialized databases and Sage's transaction knowledge help identify legitimate comps.",
      },
      {
        question: "How are comps adjusted?",
        answer:
          "Appraisers adjust for location, size, age, condition, amenities, and income differences. Documented adjustments show lenders how the subject relates to each sale.",
      },
    ],
  },
  "cost-approach": {
    slug: "cost-approach",
    term: "Cost Approach",
    image: HERO.cost,
    definition:
      "A property valuation method that estimates value based on the cost to replace or reproduce the property, minus depreciation, plus land value.",
    extendedDefinition: `The cost approach estimates value as land value plus the cost to replace or reproduce improvements, minus physical, functional, and external depreciation. It answers what a buyer would pay rather than build new.

The method is especially useful for new glamping developments, recent RV park construction, or unique sites with few sales comps. Appraisers estimate hard and soft costs, entrepreneur's profit where appropriate, and remaining economic life.

For outdoor hospitality, cost components include site work, utilities, platforms, units, clubhouses, pools, and amenity infrastructure. Sage uses the cost approach alongside income and sales methods to bracket value for lenders and developers.

Pair this term with <a href="/glossary/construction-costs">construction costs</a> and our <a href="/guides/feasibility-studies-complete-guide">feasibility studies guide</a> for development budgeting.`,
    category: "Feasibility & Appraisal",
    relatedTerms: ["appraisal", "income-approach", "comparable-sales", "construction-costs", "development-costs"],
    examples: [
      "A newly built glamping resort appraisal uses the cost approach: $400K land, $2.1M reproduction cost for units and amenities, minus $150K depreciation for startup wear, indicating $2.35M value before reconciliation with income.",
      "An RV park under construction is valued as-if-complete using cost data from recent site work bids and manufacturer unit quotes, helping the lender release construction draws.",
      "A unique dome glamping property with no comps relies primarily on cost and income approaches, with the appraiser documenting specialty structure pricing.",
    ],
    useCases: ["New construction appraisals", "Unique property valuations", "Insurance valuations"],
    seoKeywords: ["cost approach", "replacement cost", "cost valuation", "reproduction cost"],
    internalLinks: [
      { text: "Property Appraisals Complete Guide", url: "/guides/property-appraisals-complete-guide" },
      { text: "Feasibility Studies Complete Guide", url: "/guides/feasibility-studies-complete-guide" },
      { text: "Appraisal Services", url: "https://sageoutdooradvisory.com/services-overview/" },
    ],
    faqs: [
      {
        question: "When is the cost approach most useful?",
        answer:
          "Use it for new construction, proposed improvements, insurance replacements, or when income history is too short. Stabilized operating properties usually emphasize the income approach.",
      },
      {
        question: "What costs are included?",
        answer:
          "Direct construction, site infrastructure, permits, design, and sometimes developer profit. Land is valued separately. Depreciation reflects age, obsolescence, and deferred maintenance.",
      },
      {
        question: "How does cost approach relate to feasibility studies?",
        answer:
          "Feasibility studies estimate development costs and returns before you build; appraisals using the cost approach validate value once projects exist or are permitted. Sage supports both phases.",
      },
    ],
  },
};
