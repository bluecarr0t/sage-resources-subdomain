"use client";

import { useEffect, useState } from "react";

interface TableOfContentsProps {
  sections: Array<{ title: string }>;
  className?: string;
}

// Helper function to create a slug from a title
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
}

export default function TableOfContents({ sections, className = "" }: TableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>("");

  // Track scroll position for active section highlighting
  useEffect(() => {
    if (sections.length === 0) return;

    const sectionIds = sections.map((section) => slugify(section.title));

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120; // Offset for sticky header (matches scroll-mt-24 = 96px + some buffer)

      // Find the current section based on scroll position
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const element = document.getElementById(sectionIds[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  if (sections.length < 3) {
    return null; // Only show TOC for pages with 3+ sections
  }

  return (
    <nav
      className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}
      aria-label="Table of contents"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">Table of Contents</h3>
      <ul className="space-y-2">
        {sections.map((section, index) => {
          const sectionId = slugify(section.title);
          const isActive = activeSection === sectionId;

          return (
            <li key={index}>
              <a
                href={`#${sectionId}`}
                className={`block text-sm transition-colors ${
                  isActive
                    ? "text-[#006b5f] font-semibold"
                    : "text-gray-700 hover:text-[#006b5f]"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById(sectionId);
                  if (element) {
                    const offsetTop = element.offsetTop - 96; // Account for scroll-mt-24 (96px)
                    window.scrollTo({
                      top: offsetTop,
                      behavior: "smooth",
                    });
                  }
                }}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

