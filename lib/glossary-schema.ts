import { GlossaryTerm } from "./glossary/index";

interface FAQItem {
  question: string;
  answer: string;
}

export function generateDefinitionSchema(term: GlossaryTerm) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "name": term.term,
    "description": term.definition,
    "inDefinedTermSet": {
      "@type": "DefinedTermSet",
      "name": "Sage Outdoor Advisory Glossary",
      "url": "https://resources.sageoutdooradvisory.com/glossary"
    },
    "url": `https://resources.sageoutdooradvisory.com/glossary/${term.slug}`
  };
}

export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

