'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createLocaleLinks } from '@/lib/locale-links';
import { locales } from '@/i18n';
import { supabase } from '@/lib/supabase';

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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const resourcesDropdownRef = useRef<HTMLDivElement>(null);
  const servicesDropdownRef = useRef<HTMLDivElement>(null);
  const resourcesButtonRef = useRef<HTMLButtonElement>(null);
  const servicesButtonRef = useRef<HTMLButtonElement>(null);
  const lastScrollY = useRef(0);
  const scrollThreshold = 100; // Minimum scroll distance before hiding header

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
      const currentScrollY = window.scrollY;
      
      // Update scrolled state for styling
      setIsScrolled(currentScrollY > 20);
      
      // Always show header at the top of the page
      if (currentScrollY < scrollThreshold) {
        setIsHeaderVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }
      
      // Determine scroll direction
      const scrollingDown = currentScrollY > lastScrollY.current;
      const scrollingUp = currentScrollY < lastScrollY.current;
      
      // Only update if scroll direction changed significantly (prevents flickering)
      if (scrollingDown && currentScrollY - lastScrollY.current > 5) {
        setIsHeaderVisible(false);
      } else if (scrollingUp && lastScrollY.current - currentScrollY > 5) {
        setIsHeaderVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    // Throttle scroll events for better performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [scrollThreshold]);

  // Keep header visible when dropdowns or mobile menu are open
  useEffect(() => {
    if (isResourcesOpen || isServicesOpen || isMobileMenuOpen) {
      setIsHeaderVisible(true);
    }
  }, [isResourcesOpen, isServicesOpen, isMobileMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Check authentication state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle sign out
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

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

  // Handle click outside for Resources dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isResourcesOpen &&
        resourcesDropdownRef.current &&
        resourcesButtonRef.current &&
        !resourcesDropdownRef.current.contains(target) &&
        !resourcesButtonRef.current.contains(target)
      ) {
        setIsResourcesOpen(false);
      }
    };

    if (isResourcesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isResourcesOpen]);

  // Handle click outside for Services dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isServicesOpen &&
        servicesDropdownRef.current &&
        servicesButtonRef.current &&
        !servicesDropdownRef.current.contains(target) &&
        !servicesButtonRef.current.contains(target)
      ) {
        setIsServicesOpen(false);
      }
    };

    if (isServicesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isServicesOpen]);

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
          isHeaderVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        } ${
          isScrolled
            ? 'shadow-2xl backdrop-blur-xl bg-black border border-gray-800/50'
            : 'shadow-xl backdrop-blur-lg bg-black border border-gray-800/30'
        }`}
        style={{
          borderRadius: '24px',
        }}
      >
        <div className="px-4 sm:px-6 lg:px-8 py-0">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              href={`/${locale}`}
              className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity"
            >
              <div className="relative w-[115px] h-[115px] md:w-36 md:h-36 flex-shrink-0 -my-4 md:-my-6">
                <Image
                  src="https://b0evzueuuq9l227n.public.blob.vercel-storage.com/logos/sage-logo-black-header.webp"
                  alt="Sage Outdoor Advisory - Outdoor Hospitality Feasibility Studies and Appraisals"
                  fill
                  className="object-contain"
                  priority
                  fetchPriority="high"
                />
              </div>
            </Link>

            {/* Action Buttons and Navigation */}
            <div className="flex items-center gap-3">
              {/* Desktop Navigation - Resources and Services */}
              {showFullNav && (
                <>
                  <nav className="hidden lg:flex items-center gap-1">
                    {/* Resources Dropdown */}
                    <div className="relative">
                      <button
                        ref={resourcesButtonRef}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsResourcesOpen(!isResourcesOpen);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                          isActive(navLinks.guides) || isActive(navLinks.glossary)
                            ? 'text-white bg-white/10'
                            : 'text-gray-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Resources
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isResourcesOpen ? 'rotate-180' : ''
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
                      {isResourcesOpen && (
                        <div
                          ref={resourcesDropdownRef}
                          className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a] border border-gray-800/50 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl z-50"
                          onClick={(e) => {
                            // Keep dropdown open when clicking inside
                            e.stopPropagation();
                          }}
                        >
                          <Link
                            href={navLinks.guides}
                            className={`block px-4 py-3 text-base font-medium transition-all ${
                              isActive(navLinks.guides)
                                ? 'text-white bg-white/10'
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                            onClick={() => {
                              // Only close when actually navigating
                              setIsResourcesOpen(false);
                            }}
                          >
                            Guides
                          </Link>
                          <Link
                            href={navLinks.glossary}
                            className={`block px-4 py-3 text-base font-medium transition-all ${
                              isActive(navLinks.glossary)
                                ? 'text-white bg-white/10'
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                            onClick={() => {
                              // Only close when actually navigating
                              setIsResourcesOpen(false);
                            }}
                          >
                            Industry Terms
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Services Dropdown - Links to Main Site */}
                    <div className="relative">
                      <button
                        ref={servicesButtonRef}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsServicesOpen(!isServicesOpen);
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 text-gray-300 hover:text-white hover:bg-white/5"
                      >
                        Services
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isServicesOpen ? 'rotate-180' : ''
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
                      {isServicesOpen && (
                        <div
                          ref={servicesDropdownRef}
                          className="absolute top-full right-0 mt-2 w-56 bg-[#1a1a1a] border border-gray-800/50 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl z-50"
                          onClick={(e) => {
                            // Keep dropdown open when clicking inside
                            e.stopPropagation();
                          }}
                        >
                          <Link
                            href="https://sageoutdooradvisory.com/feasibility-study-glamping-resorts/"
                            className="block px-4 py-3 text-base font-medium transition-all text-gray-300 hover:text-white hover:bg-white/5"
                            onClick={() => {
                              // Only close when actually navigating
                              setIsServicesOpen(false);
                            }}
                          >
                            Feasibility Studies
                          </Link>
                          <Link
                            href="https://sageoutdooradvisory.com/appraisal-glamping-resorts/"
                            className="block px-4 py-3 text-base font-medium transition-all text-gray-300 hover:text-white hover:bg-white/5"
                            onClick={() => {
                              // Only close when actually navigating
                              setIsServicesOpen(false);
                            }}
                          >
                            Appraisals
                          </Link>
                          <div className="border-t border-gray-800/50 my-1" />
                          <Link
                            href="https://sageoutdooradvisory.com/services-overview/"
                            className="block px-4 py-3 text-base font-medium transition-all text-gray-300 hover:text-white hover:bg-white/5 font-semibold"
                            onClick={() => {
                              // Only close when actually navigating
                              setIsServicesOpen(false);
                            }}
                          >
                            All Services →
                          </Link>
                        </div>
                      )}
                    </div>
                  </nav>
                </>
              )}
              
              {/* Sign Out Button - Desktop */}
              {isAuthenticated && (
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="hidden lg:flex px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-all duration-200 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </button>
              )}

              <Link
                href="https://sageoutdooradvisory.com/contact-us/"
                className="px-4 py-2 md:px-6 md:py-2.5 bg-[#006b5f] text-white text-sm font-semibold rounded-lg hover:bg-[#005a4f] transition-all duration-200 shadow-lg hover:shadow-xl flex-shrink-0"
                style={{ borderRadius: '12px' }}
              >
                Get Free Consultation
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
              {/* Resources Section */}
              <div>
                <button
                  onClick={() => setIsResourcesOpen(!isResourcesOpen)}
                  className="w-full px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center justify-between"
                >
                  Resources
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isResourcesOpen ? 'rotate-180' : ''
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
                {isResourcesOpen && (
                  <div className="ml-4 mt-2 flex flex-col gap-1">
                    <Link
                      href={navLinks.guides}
                      className={`px-4 py-2 rounded-lg text-base font-medium transition-all ${
                        isActive(navLinks.guides)
                          ? 'text-white bg-white/10'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsResourcesOpen(false);
                      }}
                    >
                      Guides
                    </Link>
                    {navLinks.partners && (
                      <Link
                        href={navLinks.partners}
                        className={`px-4 py-2 rounded-lg text-base font-medium transition-all ${
                          isActive(navLinks.partners)
                            ? 'text-white bg-white/10'
                            : 'text-gray-300 hover:text-white hover:bg-white/5'
                        }`}
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsResourcesOpen(false);
                        }}
                      >
                        Our Partners
                      </Link>
                    )}
                    <Link
                      href={navLinks.glossary}
                      className={`px-4 py-2 rounded-lg text-base font-medium transition-all ${
                        isActive(navLinks.glossary)
                          ? 'text-white bg-white/10'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsResourcesOpen(false);
                      }}
                    >
                      Industry Terms
                    </Link>
                  </div>
                )}
              </div>

              {/* Services Section */}
              <div>
                <button
                  onClick={() => setIsServicesOpen(!isServicesOpen)}
                  className="w-full px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center justify-between"
                >
                  Services
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isServicesOpen ? 'rotate-180' : ''
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
                {isServicesOpen && (
                  <div className="ml-4 mt-2 flex flex-col gap-1">
                    <Link
                      href="https://sageoutdooradvisory.com/feasibility-study-glamping-resorts/"
                      className="px-4 py-2 rounded-lg text-base font-medium transition-all text-gray-300 hover:text-white hover:bg-white/5"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsServicesOpen(false);
                      }}
                    >
                      Feasibility Studies
                    </Link>
                    <Link
                      href="https://sageoutdooradvisory.com/appraisal-glamping-resorts/"
                      className="px-4 py-2 rounded-lg text-base font-medium transition-all text-gray-300 hover:text-white hover:bg-white/5"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsServicesOpen(false);
                      }}
                    >
                      Appraisals
                    </Link>
                    <Link
                      href="https://sageoutdooradvisory.com/services-overview/"
                      className="px-4 py-2 rounded-lg text-base font-medium transition-all text-gray-300 hover:text-white hover:bg-white/5 font-semibold"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsServicesOpen(false);
                      }}
                    >
                      All Services →
                    </Link>
                  </div>
                )}
              </div>

              {/* Sign Out Button - Mobile */}
              {isAuthenticated && (
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isSigningOut}
                  className="w-full px-4 py-3 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </button>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
