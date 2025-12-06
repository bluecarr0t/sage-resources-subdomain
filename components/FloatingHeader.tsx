'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createLocaleLinks } from '@/lib/locale-links';
import { locales } from '@/i18n';

interface FloatingHeaderProps {
  locale?: string;
  links?: {
    guides: string;
    glossary: string;
    map: string;
    partners?: string;
  };
  showFullNav?: boolean;
  showSpacer?: boolean;
}

export default function FloatingHeader({ 
  locale: propLocale,
  links: propLinks,
  showFullNav = true,
  showSpacer = true
}: FloatingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isForBusinessesOpen, setIsForBusinessesOpen] = useState(false);
  const pathname = usePathname();

  // Auto-detect locale from pathname if not provided
  const locale = useMemo(() => {
    if (propLocale) return propLocale;
    if (!pathname) return 'en';
    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0];
    return locales.includes(firstSegment as any) ? firstSegment : 'en';
  }, [propLocale, pathname]);

  // Generate links if not provided
  const links = useMemo(() => {
    if (propLinks) return propLinks;
    return createLocaleLinks(locale);
  }, [propLinks, locale]);

  // Default links if not provided
  const defaultLinks = {
    guides: `/${locale}/guides`,
    glossary: `/${locale}/glossary`,
    map: `/${locale}/map`,
    partners: `/${locale}/partners`,
  };

  const navLinks = links || defaultLinks;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  return (
    <>
      {/* Spacer to prevent content from going under the floating header */}
      {showSpacer && <div className="h-24 md:h-20" />}
      
      {/* Floating Header */}
      <header
        className={`fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-50 transition-all duration-300 ${
          isScrolled
            ? 'shadow-2xl backdrop-blur-xl bg-black border border-gray-800/50'
            : 'shadow-xl backdrop-blur-lg bg-black border border-gray-800/30'
        }`}
        style={{
          borderRadius: '24px',
        }}
      >
        <div className="px-4 sm:px-6 lg:px-8 py-1 md:py-1.5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              href="https://resources.sageoutdooradvisory.com" 
              className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity"
            >
              <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
                <Image
                  src="https://b0evzueuuq9l227n.public.blob.vercel-storage.com/logos/sage-logo-black-header.webp"
                  alt="Sage Outdoor Advisory"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            {showFullNav && (
              <>
                <nav className="hidden lg:flex items-center gap-1">
                  {/* For Businesses Dropdown */}
                  <div
                    className="relative"
                    onMouseEnter={() => setIsForBusinessesOpen(true)}
                    onMouseLeave={(e) => {
                      // Only close if mouse is not moving to dropdown
                      const relatedTarget = e.relatedTarget as HTMLElement;
                      if (!relatedTarget || !relatedTarget.closest('[data-dropdown-menu]')) {
                        setIsForBusinessesOpen(false);
                      }
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsForBusinessesOpen(!isForBusinessesOpen);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                        isActive(navLinks.guides) || isActive(navLinks.partners || '')
                          ? 'text-white bg-white/10'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      For Businesses
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isForBusinessesOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {isForBusinessesOpen && (
                      <div
                        data-dropdown-menu
                        className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a] border border-gray-800/50 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl z-50"
                        onMouseEnter={() => setIsForBusinessesOpen(true)}
                        onMouseLeave={() => {
                          // Delay closing to allow clicks
                          setTimeout(() => {
                            setIsForBusinessesOpen(false);
                          }, 150);
                        }}
                        onMouseDown={(e) => {
                          // Prevent closing when clicking inside dropdown
                          e.stopPropagation();
                        }}
                      >
                        <Link
                          href={navLinks.guides}
                          className={`block px-4 py-3 text-sm font-medium transition-all ${
                            isActive(navLinks.guides)
                              ? 'text-white bg-white/10'
                              : 'text-gray-300 hover:text-white hover:bg-white/5'
                          }`}
                          onClick={() => {
                            // Close dropdown after navigation
                            setIsForBusinessesOpen(false);
                          }}
                        >
                          Guides
                        </Link>
                        {navLinks.partners && (
                          <Link
                            href={navLinks.partners}
                            className={`block px-4 py-3 text-sm font-medium transition-all ${
                              isActive(navLinks.partners)
                                ? 'text-white bg-white/10'
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                            onClick={() => {
                              // Close dropdown after navigation
                              setIsForBusinessesOpen(false);
                            }}
                          >
                            Partners
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                  <Link
                    href={navLinks.glossary}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(navLinks.glossary)
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Glossary
                  </Link>
                </nav>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="https://sageoutdooradvisory.com/contact-us/"
                className="px-4 py-2 md:px-6 md:py-2.5 bg-[#00b6a6] text-white text-sm font-semibold rounded-lg hover:bg-[#009688] transition-all duration-200 shadow-lg hover:shadow-xl flex-shrink-0"
                style={{ borderRadius: '12px' }}
              >
                Contact Us
              </Link>

              {/* Mobile Menu Button */}
              {showFullNav && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 text-gray-300 hover:text-white transition-colors"
                  aria-label="Toggle menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {isMobileMenuOpen ? (
                      <path d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showFullNav && isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-800/50 px-4 py-4">
            <nav className="flex flex-col gap-2">
              {/* For Businesses Section */}
              <div>
                <button
                  onClick={() => setIsForBusinessesOpen(!isForBusinessesOpen)}
                  className="w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center justify-between"
                >
                  For Businesses
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isForBusinessesOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isForBusinessesOpen && (
                  <div className="ml-4 mt-2 flex flex-col gap-1">
                    <Link
                      href={navLinks.guides}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive(navLinks.guides)
                          ? 'text-white bg-white/10'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsForBusinessesOpen(false);
                      }}
                    >
                      Guides
                    </Link>
                    {navLinks.partners && (
                      <Link
                        href={navLinks.partners}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive(navLinks.partners)
                            ? 'text-white bg-white/10'
                            : 'text-gray-300 hover:text-white hover:bg-white/5'
                        }`}
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsForBusinessesOpen(false);
                        }}
                      >
                        Partners
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <Link
                href={navLinks.glossary}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive(navLinks.glossary)
                    ? 'text-white bg-white/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Glossary
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
