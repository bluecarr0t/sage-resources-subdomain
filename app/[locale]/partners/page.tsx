import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/FloatingHeader";

export const metadata: Metadata = {
  title: "Sage Partners | Industry-Leading Outdoor Hospitality Experts | Sage Outdoor Advisory",
  description: "Sage partners exclusively with industry-leading firms specializing in architecture, engineering, financing, management, planning, and development for outdoor hospitality projects.",
  keywords: "outdoor hospitality partners, glamping consultants, RV resort partners, campground development partners, hospitality financing",
  openGraph: {
    title: "Sage Partners | Industry-Leading Outdoor Hospitality Experts",
    description: "Trusted partners for outdoor hospitality development, from design and engineering to financing and management",
    url: "https://resources.sageoutdooradvisory.com/partners",
    siteName: "Sage Outdoor Advisory",
    type: "website",
    images: [
      {
        url: "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/forest-scene.jpg",
        width: 1920,
        height: 1080,
        alt: "Sage Outdoor Advisory partners background featuring scenic landscape",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/forest-scene.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

interface Partner {
  name: string;
  description: string;
  contacts: {
    name: string;
    title: string;
    email: string;
  }[];
}

interface PartnerCategory {
  title: string;
  partners: Partner[];
}

export default function PartnersPage() {
  const partnerCategories: PartnerCategory[] = [
    {
      title: "Design & Engineering",
      partners: [
        {
          name: "LJA Engineering",
          description:
            "LJA Engineering provides comprehensive engineering solutions tailored to the unique needs of outdoor hospitality developments. Known for their precision, reliability, and collaborative mindset, they help bring complex projects to life with innovative infrastructure and site design strategies.",
          contacts: [
            {
              name: "Shannon Gordon",
              title: "Principal",
              email: "sgordon@lja.com",
            },
            {
              name: "Zach Stoltenberg",
              title: "Associated Principal",
              email: "zstoltenberg@LJA.com",
            },
          ],
        },
        {
          name: "Clockwork",
          description:
            "Clockwork brings a visionary, hospitality-focused design approach that transforms outdoor destinations into unforgettable guest experiences. With deep expertise in architecture, planning, and experiential environments, their team blends creativity with functionality to elevate every project.",
          contacts: [
            {
              name: "Christian Arnold",
              title: "Founding Principal",
              email: "christian@clockwork-ad.com",
            },
          ],
        },
      ],
    },
    {
      title: "Financing & Capital Partners",
      partners: [
        {
          name: "Live Oak Bank",
          description:
            "Live Oak Bank is a national leader in specialized lending, providing tailored financial solutions that empower outdoor hospitality developers to grow with confidence. With deep industry expertise, a streamlined lending process, and a commitment to long-term partnership, Live Oak helps owners secure the capital needed to develop, expand, and elevate their outdoor destinations.",
          contacts: [
            {
              name: "Pierce Verchick",
              title: "Head of RV Park Lending",
              email: "pierce.verchick@liveoak.bank",
            },
          ],
        },
      ],
    },
    {
      title: "3rd Party Management",
      partners: [
        {
          name: "CRR Hospitality",
          description:
            "CRR Hospitality delivers professional third-party management for RV resorts, campgrounds, and outdoor destinations. Their team specializes in experiential hospitality, revenue optimization, and modern operational systems that increase profitability and elevate the guest experience.",
          contacts: [
            {
              name: "Mike Harrison",
              title: "Chief Operating Officer",
              email: "mharrison@crrhospitality.com",
            },
          ],
        },
        {
          name: "Horizon Outdoor Hospitality",
          description:
            "Horizon Outdoor Hospitality provides expert management and strategic support for RV resorts, campgrounds, and glamping properties. With decades of industry experience, they focus on improving operations, boosting revenue, and enhancing the guest journey across all outdoor hospitality assets.",
          contacts: [
            {
              name: "Scott Foos",
              title: "Managing Partner",
              email: "scott.foos@horizonoutdoors.com",
            },
          ],
        },
      ],
    },
    {
      title: "Unit Layout Strategy and Comprehensive Planning",
      partners: [
        {
          name: "MSCAPES",
          description:
            "MSCAPES specializes in transforming raw land into purposefully designed outdoor destinations through comprehensive planning, concept development, and unit layout strategy. With a deep understanding of guest experience, operational flow, and land-use efficiency, MSCAPES creates environments that are both functional and inspiring. Their team brings a holistic approach—blending creativity, practicality, and technical expertise—to deliver cohesive plans that set the foundation for successful outdoor hospitality projects.",
          contacts: [
            {
              name: "Melita Bouchet",
              title: "Director of Operations & Growth",
              email: "Melita@mscapescorp.com",
            },
          ],
        },
      ],
    },
    {
      title: "RV Park Planning",
      partners: [
        {
          name: "RV Park Consulting Inc.",
          description:
            "RV Park Consulting Inc. offers expert consulting for RV Resorts and Parks across North America. With 25+ years of experience, they specialize in site plans, permitting, operations, and management. They've worked on projects from 16 to 4,800 sites, delivering tailored solutions that meet industry standards.",
          contacts: [
            {
              name: "Ray Davis",
              title: "Owner",
              email: "ray@rvparkconsulting.com",
            },
          ],
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Header */}
      <FloatingHeader />

      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/forest-scene.jpg"
            alt="Sage Outdoor Advisory partners background featuring scenic landscape"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            quality={90}
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-indigo-900/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">
              Partners
            </h1>
            <p className="text-xl text-white/95 max-w-3xl mx-auto drop-shadow-md leading-relaxed">
              Launching and operating an outdoor hospitality business involves many moving
              parts—from site planning and financing to design, permitting, and daily
              operations. Every stage plays a crucial role in the long-term success of your
              destination.
            </p>
          </div>
        </div>
      </section>

      <main>
      {/* Introduction Section */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none text-center">
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              That&apos;s why Sage partners exclusively with industry-leading firms who bring
              deep expertise and proven results across every discipline. Our preferred partners
              are specialists in architecture, engineering, financing, management, planning,
              and development—trusted professionals who share our commitment to elevating the
              outdoor hospitality experience.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Whether you&apos;re building from the ground up or scaling an existing property,
              these partners ensure you have the right experts guiding each step of the journey.
            </p>
          </div>
        </div>
      </section>

      {/* Partners by Category */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {partnerCategories.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                  {category.title}
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  {category.partners.map((partner, partnerIndex) => (
                    <div
                      key={partnerIndex}
                      className="bg-white p-8 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
                    >
                      <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                        {partner.name}
                      </h3>
                      <p className="text-gray-700 leading-relaxed mb-6">
                        {partner.description}
                      </p>
                      <div className="space-y-3">
                        {partner.contacts.map((contact, contactIndex) => (
                          <div key={contactIndex} className="border-t border-gray-200 pt-3">
                            <p className="font-semibold text-gray-900">
                              {contact.name} – {contact.title}
                            </p>
                            <p className="text-gray-700">
                              Contact:{" "}
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-[#006b5f] hover:text-[#005a4f] underline"
                              >
                                {contact.email}
                              </a>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interested in Partnering Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Interested in Partnering with Sage?
          </h2>
          <p className="text-xl text-gray-700 mb-8">
            Schedule a call with us to discuss partnership opportunities.
          </p>
          <Link
            href="https://sageoutdooradvisory.com/contact-us/"
            className="inline-block px-8 py-4 bg-[#00b6a6] text-white text-lg font-semibold rounded-lg hover:bg-[#009688] transition-colors shadow-lg"
          >
            Schedule a Call with Us
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#00b6a6] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Outdoor Hospitality Project?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Connect with our trusted partners and get expert guidance for every stage of your
            development journey.
          </p>
          <Link
            href="https://sageoutdooradvisory.com/contact-us/"
            className="inline-block px-8 py-4 bg-white text-[#006b5f] text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            Schedule Free Consultation
          </Link>
        </div>
      </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

