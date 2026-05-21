/** Client testimonials shown on landing pages — keep in sync with Review JSON-LD. */
export type SageLandingTestimonial = {
  author: string;
  role: string;
  rating: number;
  reviewBody: string;
  datePublished: string;
  footnote?: string;
};

export const SAGE_LANDING_TESTIMONIALS: SageLandingTestimonial[] = [
  {
    author: 'Randy Knapp',
    role: 'Owner – Margaritaville RV Resort, Auburndale FL',
    rating: 5,
    reviewBody:
      "Sage's feasibility study was essential to the success of the first phases of development at our Margaritaville RV Resort in Auburndale. They continue to provide valuable market and financial insights for several of our other new projects. Their unparalleled knowledge of the industry and their unwavering commitment to their clients make them a true asset.",
    datePublished: '2024-01-15',
    footnote:
      "Recipient of 'Top 10' Awards from USA Today, Campendium, RV Share and Traveler's Choice",
  },
  {
    author: 'Bygnal Dutson',
    role: 'Founder of Open Sky, Zion, UT',
    rating: 5,
    reviewBody:
      'Sage creates win-win scenarios for hoteliers and bankers or investors who want to get into the unconventional glamping space. Open Sky is currently in its second season of operations, in large part, thanks to the relationship with Sage. They provided a thorough and realistic appraisal of our glamping property, which in turn, allowed Open Sky to secure traditional bank funding for our pre-planned & designed build out.',
    datePublished: '2024-06-01',
  },
];
