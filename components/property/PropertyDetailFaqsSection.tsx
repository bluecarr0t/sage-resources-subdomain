import { EDITORIAL_SECTION_LABEL_CLASS } from '@/components/editorial/EditorialPageShell';

export type PropertyFaqEntry = { question: string; answer: string };

type PropertyDetailFaqsSectionProps = {
  propertyFaqs: PropertyFaqEntry[];
};

/** Full-width property FAQs (SSR or client); aligned with JSON-LD FAQ schema. */
export default function PropertyDetailFaqsSection({ propertyFaqs }: PropertyDetailFaqsSectionProps) {
  if (propertyFaqs.length === 0) return null;

  return (
    <section
      className="mt-14 border border-sage-200/90 bg-white/40 px-6 py-8 sm:px-8"
      aria-labelledby="property-faq-heading"
    >
      <h2 id="property-faq-heading" className={EDITORIAL_SECTION_LABEL_CLASS}>
        Frequently asked questions
      </h2>
      <div className="mt-6 space-y-8">
        {propertyFaqs.map((item) => (
          <div key={item.question}>
            <p className="text-sm font-bold text-neutral-900">{item.question}</p>
            <p className="mt-2 max-w-prose text-sm font-light leading-relaxed text-neutral-600">
              {item.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
