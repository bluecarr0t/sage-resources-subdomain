import PropertyDetailFaqsSection, {
  type PropertyFaqEntry,
} from '@/components/property/PropertyDetailFaqsSection';

type PropertyDetailServerFaqsProps = {
  propertyFaqs: PropertyFaqEntry[];
};

/** SSR wrapper for full-width property FAQs. */
export default function PropertyDetailServerFaqs({ propertyFaqs }: PropertyDetailServerFaqsProps) {
  return <PropertyDetailFaqsSection propertyFaqs={propertyFaqs} />;
}
