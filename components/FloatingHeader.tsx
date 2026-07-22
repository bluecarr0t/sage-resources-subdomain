'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createLocaleLinks } from '@/lib/locale-links';
import { locales } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { EDITORIAL_BUTTON_PRIMARY_CLASS } from '@/components/editorial/EditorialPageShell';

const HEADER_LOGO_URL =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/logos/sage-logo-header-nav.png';

const HEADER_SHELL_CLASS = 'bg-black border-b border-gray-800/50 backdrop-blur-lg';

const NAV_LINK_IDLE_CLASS =
  'px-3 py-2 text-[11px] font-medium uppercase tracking-widest text-gray-300 transition-colors hover:bg-white/5 hover:text-white';

const NAV_LINK_ACTIVE_CLASS =
  'px-3 py-2 text-[11px] font-medium uppercase tracking-widest text-white bg-white/10';

const NAV_DROPDOWN_PANEL_CLASS =
  'absolute top-full right-0 z-50 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-gray-800/50 bg-[#1a1a1a] py-1 shadow-2xl backdrop-blur-xl';

const NAV_DROPDOWN_ITEM_CLASS =
  'block px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-gray-300 transition-colors hover:bg-white/5 hover:text-white';

const NAV_DROPDOWN_ITEM_ACTIVE_CLASS =
  'block px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-white bg-white/10';

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
  showSpacer = true,
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
  const scrollThreshold = 100;

  const locale = useMemo(() => {
    if (propLocale) return propLocale;
    if (!pathname) return 'en';
    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0];
    return locales.includes(firstSegment as (typeof locales)[number]) ? firstSegment : 'en';
  }, [propLocale, pathname]);

  const links = useMemo(() => {
    if (propLinks) return propLinks;
    return createLocaleLinks(locale);
  }, [propLinks, locale]);

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
      setIsScrolled(currentScrollY > 20);

      if (currentScrollY < scrollThreshold) {
        setIsHeaderVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      const scrollingDown = currentScrollY > lastScrollY.current;
      const scrollingUp = currentScrollY < lastScrollY.current;

      if (scrollingDown && currentScrollY - lastScrollY.current > 5) {
        setIsHeaderVisible(false);
      } else if (scrollingUp && lastScrollY.current - currentScrollY > 5) {
        setIsHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

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

  useEffect(() => {
    if (isResourcesOpen || isServicesOpen || isMobileMenuOpen) {
      setIsHeaderVisible(true);
    }
  }, [isResourcesOpen, isServicesOpen, isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const resourcesActive = isActive(navLinks.guides) || isActive(navLinks.glossary);

  const marketOverviewHref = '/glamping-market-overview';
  const marketOverviewActive = isActive(marketOverviewHref);

  const navTriggerClass = (active: boolean) =>
    active
      ? `${NAV_LINK_ACTIVE_CLASS} flex items-center gap-1`
      : `${NAV_LINK_IDLE_CLASS} flex items-center gap-1`;

  const chevron = (open: boolean) => (
    <svg
      className={`h-3 w-3 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  return (
    <>
      {showSpacer ? <div className="h-16 md:h-16" aria-hidden /> : null}

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${HEADER_SHELL_CLASS} ${
          isHeaderVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        } ${isScrolled ? 'shadow-xl' : 'shadow-lg'}`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href={`/${locale}`}
            className="flex shrink-0 items-center hover:opacity-90 transition-opacity"
          >
            <div className="relative h-10 w-36 sm:h-11 sm:w-40">
              <Image
                src={HEADER_LOGO_URL}
                alt="Sage Outdoor Advisory"
                fill
                className="object-contain object-left"
                priority
                fetchPriority="high"
              />
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {showFullNav ? (
              <nav className="hidden lg:flex items-center gap-0.5">
                <div className="relative">
                  <button
                    ref={resourcesButtonRef}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsResourcesOpen(!isResourcesOpen);
                      setIsServicesOpen(false);
                    }}
                    className={navTriggerClass(resourcesActive)}
                    aria-expanded={isResourcesOpen}
                  >
                    Resources
                    {chevron(isResourcesOpen)}
                  </button>
                  {isResourcesOpen ? (
                    <div
                      ref={resourcesDropdownRef}
                      className={NAV_DROPDOWN_PANEL_CLASS}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={navLinks.guides}
                        className={
                          isActive(navLinks.guides)
                            ? NAV_DROPDOWN_ITEM_ACTIVE_CLASS
                            : NAV_DROPDOWN_ITEM_CLASS
                        }
                        onClick={() => setIsResourcesOpen(false)}
                      >
                        Guides
                      </Link>
                      <Link
                        href={navLinks.glossary}
                        className={
                          isActive(navLinks.glossary)
                            ? NAV_DROPDOWN_ITEM_ACTIVE_CLASS
                            : NAV_DROPDOWN_ITEM_CLASS
                        }
                        onClick={() => setIsResourcesOpen(false)}
                      >
                        Industry Terms
                      </Link>
                    </div>
                  ) : null}
                </div>

                <Link
                  href={marketOverviewHref}
                  className={
                    marketOverviewActive ? NAV_LINK_ACTIVE_CLASS : NAV_LINK_IDLE_CLASS
                  }
                >
                  Market Overview
                </Link>

                <div className="relative">
                  <button
                    ref={servicesButtonRef}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsServicesOpen(!isServicesOpen);
                      setIsResourcesOpen(false);
                    }}
                    className={navTriggerClass(false)}
                    aria-expanded={isServicesOpen}
                  >
                    Services
                    {chevron(isServicesOpen)}
                  </button>
                  {isServicesOpen ? (
                    <div
                      ref={servicesDropdownRef}
                      className={`${NAV_DROPDOWN_PANEL_CLASS} min-w-[13rem]`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href="https://sageoutdooradvisory.com/feasibility-study-glamping-resorts/"
                        className={NAV_DROPDOWN_ITEM_CLASS}
                        onClick={() => setIsServicesOpen(false)}
                      >
                        Feasibility Studies
                      </Link>
                      <Link
                        href="https://sageoutdooradvisory.com/appraisal-glamping-resorts/"
                        className={NAV_DROPDOWN_ITEM_CLASS}
                        onClick={() => setIsServicesOpen(false)}
                      >
                        Appraisals
                      </Link>
                      <div className="my-1 border-t border-gray-800/50" />
                      <Link
                        href="https://sageoutdooradvisory.com/services-overview/"
                        className={`${NAV_DROPDOWN_ITEM_CLASS} font-semibold`}
                        onClick={() => setIsServicesOpen(false)}
                      >
                        All Services →
                      </Link>
                    </div>
                  ) : null}
                </div>
              </nav>
            ) : null}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={`hidden lg:flex ${NAV_LINK_IDLE_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </button>
            ) : null}

            <Link
              href="https://sageoutdooradvisory.com/contact-us/"
              className={`${EDITORIAL_BUTTON_PRIMARY_CLASS} shrink-0 px-4 py-2 text-[10px] sm:px-5 sm:text-[11px]`}
            >
              Get In Touch
            </Link>

            {showFullNav ? (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-300 transition-colors hover:text-white"
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  {isMobileMenuOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {showFullNav && isMobileMenuOpen ? (
          <div className="lg:hidden border-t border-gray-800/50 bg-black px-4 py-4">
            <nav className="flex flex-col gap-1">
              <div>
                <button
                  type="button"
                  onClick={() => setIsResourcesOpen(!isResourcesOpen)}
                  className={`${NAV_LINK_IDLE_CLASS} w-full flex items-center justify-between`}
                >
                  Resources
                  {chevron(isResourcesOpen)}
                </button>
                {isResourcesOpen ? (
                  <div className="ml-2 mt-1 flex flex-col gap-0.5 border-l border-gray-700 pl-3">
                    <Link
                      href={navLinks.guides}
                      className={
                        isActive(navLinks.guides)
                          ? NAV_DROPDOWN_ITEM_ACTIVE_CLASS
                          : NAV_DROPDOWN_ITEM_CLASS
                      }
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsResourcesOpen(false);
                      }}
                    >
                      Guides
                    </Link>
                    {navLinks.partners ? (
                      <Link
                        href={navLinks.partners}
                        className={
                          isActive(navLinks.partners)
                            ? NAV_DROPDOWN_ITEM_ACTIVE_CLASS
                            : NAV_DROPDOWN_ITEM_CLASS
                        }
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsResourcesOpen(false);
                        }}
                      >
                        Our Partners
                      </Link>
                    ) : null}
                    <Link
                      href={navLinks.glossary}
                      className={
                        isActive(navLinks.glossary)
                          ? NAV_DROPDOWN_ITEM_ACTIVE_CLASS
                          : NAV_DROPDOWN_ITEM_CLASS
                      }
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsResourcesOpen(false);
                      }}
                    >
                      Industry Terms
                    </Link>
                  </div>
                ) : null}
              </div>

              <Link
                href={marketOverviewHref}
                className={
                  marketOverviewActive
                    ? `${NAV_LINK_ACTIVE_CLASS} w-full`
                    : `${NAV_LINK_IDLE_CLASS} w-full`
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Market Overview
              </Link>

              <div>
                <button
                  type="button"
                  onClick={() => setIsServicesOpen(!isServicesOpen)}
                  className={`${NAV_LINK_IDLE_CLASS} w-full flex items-center justify-between`}
                >
                  Services
                  {chevron(isServicesOpen)}
                </button>
                {isServicesOpen ? (
                  <div className="ml-2 mt-1 flex flex-col gap-0.5 border-l border-gray-700 pl-3">
                    <Link
                      href="https://sageoutdooradvisory.com/feasibility-study-glamping-resorts/"
                      className={NAV_DROPDOWN_ITEM_CLASS}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsServicesOpen(false);
                      }}
                    >
                      Feasibility Studies
                    </Link>
                    <Link
                      href="https://sageoutdooradvisory.com/appraisal-glamping-resorts/"
                      className={NAV_DROPDOWN_ITEM_CLASS}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsServicesOpen(false);
                      }}
                    >
                      Appraisals
                    </Link>
                    <Link
                      href="https://sageoutdooradvisory.com/services-overview/"
                      className={`${NAV_DROPDOWN_ITEM_CLASS} font-semibold`}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsServicesOpen(false);
                      }}
                    >
                      All Services →
                    </Link>
                  </div>
                ) : null}
              </div>

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isSigningOut}
                  className={`${NAV_LINK_IDLE_CLASS} w-full text-left disabled:opacity-50`}
                >
                  {isSigningOut ? 'Signing out…' : 'Sign out'}
                </button>
              ) : null}
            </nav>
          </div>
        ) : null}
      </header>
    </>
  );
}
