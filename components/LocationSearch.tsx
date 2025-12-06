'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLoadScript } from '@react-google-maps/api';

// Fix performance warning: keep libraries array as constant outside component
const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

interface LocationSearchProps {
  locale: string;
  onLocationSelect?: (location: { lat: number; lng: number; name: string }) => void;
  variant?: 'default' | 'compact';
}

export default function LocationSearch({ locale, onLocationSelect, variant = 'default' }: LocationSearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number>(400);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownScrollRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Log API key status (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (apiKey) {
        console.log('[LocationSearch] API Key loaded');
      } else {
        console.warn('[LocationSearch] ⚠️ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set!');
      }
    }
  }, [apiKey]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (loadError) {
      console.error('[LocationSearch] Google Maps load error:', loadError);
    }
    
    if (isLoaded && typeof window !== 'undefined' && window.google) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }
  }, [isLoaded, loadError]);

  // Debug: Log isOpen state changes (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[LocationSearch] Dropdown state:', isOpen ? 'open' : 'closed');
    }
  }, [isOpen]);

  // Calculate available space for dropdown when it opens
  useEffect(() => {
    if (isOpen && containerRef.current && inputRef.current) {
      const calculateMaxHeight = () => {
        const input = inputRef.current;
        if (!input) return;

        const inputRect = input.getBoundingClientRect();
        
        // Check if we're in a sidebar (map page) or hero section (landing page)
        const sidebar = input.closest('aside');
        const heroSection: HTMLElement | null = input.closest('section');
        
        let availableSpace: number;
        const isDesktop = window.innerWidth >= 768; // md breakpoint
        
        if (sidebar) {
          // For sidebar context (map page): calculate space to bottom of sidebar or viewport
          const sidebarRect = sidebar.getBoundingClientRect();
          const viewportBottom = window.innerHeight;
          const sidebarBottom = sidebarRect.bottom;
          
          // Use the smaller of sidebar bottom or viewport bottom
          const containerBottom = Math.min(sidebarBottom, viewportBottom);
          const inputBottom = inputRect.bottom;
          
          // Account for: input bottom + mt-2 (8px margin) + padding (16px)
          availableSpace = containerBottom - inputBottom - 8 - 16;
          
          // On desktop, allow larger dropdown (up to 500px), on mobile cap at 300px
          const maxHeight = isDesktop ? 500 : 300;
          const minHeight = isDesktop ? 200 : 120;
          
          availableSpace = Math.max(minHeight, Math.min(maxHeight, Math.max(0, availableSpace)));
        } else if (heroSection) {
          // For hero section context (landing page): use existing logic
          const heroRect = heroSection.getBoundingClientRect();
          const heroBottom = heroRect.bottom;
          const inputBottom = inputRect.bottom;
          const spaceBelow = heroBottom - inputBottom - 8 - 16;
          
          // Original limits for hero section
          availableSpace = Math.max(120, Math.min(280, Math.max(0, spaceBelow)));
        } else {
          // Fallback: use viewport height
          const viewportBottom = window.innerHeight;
          const inputBottom = inputRect.bottom;
          const spaceBelow = viewportBottom - inputBottom - 8 - 16;
          
          const maxHeight = isDesktop ? 500 : 300;
          const minHeight = isDesktop ? 200 : 120;
          availableSpace = Math.max(minHeight, Math.min(maxHeight, Math.max(0, spaceBelow)));
        }
        
        setDropdownMaxHeight(availableSpace);
      };

      // Calculate on open with a small delay to ensure DOM is ready
      const timeoutId = setTimeout(calculateMaxHeight, 10);

      // Recalculate on window resize or scroll
      window.addEventListener('resize', calculateMaxHeight);
      window.addEventListener('scroll', calculateMaxHeight, true);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', calculateMaxHeight);
        window.removeEventListener('scroll', calculateMaxHeight, true);
      };
    }
  }, [isOpen]);

  // Scroll selected item into view when using keyboard navigation
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownScrollRef.current) {
      const selectedElement = dropdownScrollRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [selectedIndex]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Simple click outside detection - the ONLY thing that closes the dropdown (besides selection/escape)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle clicks when dropdown is open
      if (!isOpen) return;
      
      const target = event.target as Node;
      const isInside = containerRef.current?.contains(target);
      
      if (containerRef.current && !isInside) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    // Use a small delay to ensure dropdown is fully rendered before attaching listener
    const timeoutId = setTimeout(() => {
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Debounced search function
  const performSearch = useCallback((value: string) => {
    console.log('[LocationSearch] performSearch called with:', value);
    
    if (!apiKey) {
      console.error('[LocationSearch] ❌ API Key is missing! Cannot perform search.');
      setApiError('Google Maps API key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.');
      return;
    }
    
    if (!autocompleteServiceRef.current || value.length < 2) {
      console.log('[LocationSearch] Search aborted - no service or value too short');
      setPredictions([]);
      return;
    }

    console.log('[LocationSearch] Starting Google Places API call...');
    setIsSearching(true);
    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: value,
        types: ['(cities)'],
        componentRestrictions: { country: ['us', 'ca'] },
      },
      (results, status) => {
        console.log('[LocationSearch] API Response - Status:', status, 'Results:', results?.length || 0);
        setIsSearching(false);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          console.log('[LocationSearch] Setting predictions and opening dropdown');
          setPredictions(results);
          setIsOpen(true);
          setApiError(null);
        } else {
          console.log('[LocationSearch] No results or error, clearing predictions. Status:', status);
          
          // Handle specific error cases
          if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
            const errorMsg = 'Google Places API access denied. Please check your API key configuration and ensure Places API is enabled.';
            setApiError(errorMsg);
            console.error('[LocationSearch] ❌ API REQUEST_DENIED');
            console.error('[LocationSearch] Fix: Enable "Places API" in Google Cloud Console > APIs & Services > Library');
            console.error('[LocationSearch] Fix: Ensure API key has Places API enabled in restrictions');
          } else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
            setApiError('API quota exceeded. Please try again later.');
            console.warn('[LocationSearch] ⚠️ API quota exceeded');
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setApiError(null); // No error, just no results
            console.log('[LocationSearch] No results found for query');
          } else if (status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST) {
            setApiError('Invalid search request. Please check your input.');
            console.error('[LocationSearch] ❌ INVALID_REQUEST');
          } else {
            setApiError(`Search error: ${status}`);
            console.error('[LocationSearch] ❌ API Error Status:', status);
          }
          
          setPredictions([]);
        }
      }
    );
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('[LocationSearch] Input changed:', value);
    setSearchValue(value);
    setSelectedIndex(-1);

    if (!value.trim()) {
      console.log('[LocationSearch] Empty input - clearing');
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    // Debounce the search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 2) {
      console.log('[LocationSearch] Scheduling search in 150ms');
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 150);
    }
  };

  const handlePlaceSelect = (placeId: string, description: string) => {
    if (typeof window === 'undefined' || !window.google || !placeId) {
      return;
    }

    const service = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );

    service.getDetails(
      {
        placeId,
        fields: ['geometry', 'name', 'formatted_address'],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const name = place.name || description;

          if (onLocationSelect) {
            onLocationSelect({ lat, lng, name });
          } else {
            router.push(`/${locale}/map?lat=${lat}&lon=${lng}&zoom=10&search=${encodeURIComponent(name)}`);
          }

          setSearchValue(name);
          setIsOpen(false);
          setPredictions([]);
          setSelectedIndex(-1);
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) {
      if (e.key === 'Enter' && searchValue.trim()) {
        handleSubmit(e as unknown as React.FormEvent);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handlePlaceSelect(
            predictions[selectedIndex].place_id,
            predictions[selectedIndex].description
          );
        } else if (predictions.length > 0) {
          handlePlaceSelect(predictions[0].place_id, predictions[0].description);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (predictions.length > 0) {
      handlePlaceSelect(predictions[0].place_id, predictions[0].description);
    } else {
      // If nothing is selected, redirect to map page
      router.push(`/${locale}/map`);
    }
  };

  const handleFocus = () => {
    if (predictions.length > 0) {
      setIsOpen(true);
    } else if (searchValue.length >= 2) {
      performSearch(searchValue);
    }
  };

  if (loadError) {
    return (
      <div className="text-red-500 text-sm">
        Error loading Google Maps. Please check your API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-14 bg-gray-200 rounded-xl animate-pulse" />
            <div className="w-32 h-14 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const showDropdown = isOpen && predictions.length > 0;
  const isCompact = variant === 'compact';

  return (
    <div ref={containerRef} className={`w-full relative ${isCompact ? '' : 'max-w-2xl mx-auto'}`}>
      <form onSubmit={handleSubmit}>
        <div className={isCompact 
          ? "bg-white rounded-lg shadow-sm border border-gray-200 p-1"
          : "bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-1 border border-white/20"
        }>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isCompact ? 'left-3' : 'left-4'}`}>
                <svg
                  className={isCompact ? "w-5 h-5" : "w-6 h-6"}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                placeholder={isCompact ? "Search location..." : "Enter your destination (city, state, or region)"}
                className={`w-full bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 ${
                  isCompact ? 'pl-10 pr-3 py-2.5 text-sm' : 'pl-12 pr-4 py-4 text-lg'
                }`}
                autoComplete="off"
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls="location-listbox"
                aria-autocomplete="list"
              />
              {isSearching && (
                <div className={`absolute top-1/2 -translate-y-1/2 ${isCompact ? 'right-3' : 'right-4'}`}>
                  <div className={`animate-spin rounded-full border-[#00b6a6] ${isCompact ? 'h-4 w-4 border-2' : 'h-5 w-5 border-b-2'}`} />
                </div>
              )}
            </div>
            {!isCompact && (
              <button
                type="submit"
                className="px-8 py-4 bg-[#00b6a6] text-white font-semibold rounded-xl hover:bg-[#009688] transition-colors shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                Find Glamping
              </button>
            )}
          </div>
        </div>
      </form>

      {/* API Error Message */}
      {apiError && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-red-50 border border-red-200 rounded-xl p-3 z-[100]">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">API Error</p>
              <p className="text-xs text-red-600 mt-1">{apiError}</p>
              {apiError.includes('REQUEST_DENIED') && (
                <p className="text-xs text-red-500 mt-2">
                  Enable the <strong>Places API</strong> in your Google Cloud Console and ensure your API key has the correct restrictions.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Autocomplete Predictions Dropdown */}
      {showDropdown && (
        <div
          id="location-listbox"
          role="listbox"
          className={`absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 z-[100] overflow-hidden flex flex-col ${
            isCompact ? 'rounded-lg shadow-lg' : 'rounded-xl shadow-2xl'
          }`}
          style={{ maxHeight: `${dropdownMaxHeight}px` }}
        >
          <div className={`${isCompact ? 'px-2 py-1.5' : 'px-3 py-2'} bg-gray-50 border-b border-gray-200 flex-shrink-0`}>
            <p className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-semibold text-gray-600 uppercase tracking-wide`}>Suggestions</p>
          </div>
          <div ref={dropdownScrollRef} className="location-dropdown-scroll overflow-y-auto overscroll-contain">
            {predictions.map((prediction, index) => (
              <div
                key={prediction.place_id}
                role="option"
                aria-selected={selectedIndex === index}
                onClick={() => {
                  handlePlaceSelect(prediction.place_id, prediction.description);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left transition-colors border-b border-gray-100 last:border-b-0 cursor-pointer ${
                  isCompact ? 'px-3 py-2' : 'px-4 py-3'
                } ${
                  selectedIndex === index
                    ? 'bg-[#00b6a6]/10 border-[#00b6a6]/20'
                    : 'hover:bg-[#00b6a6]/5 active:bg-[#00b6a6]/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`${isCompact ? 'mt-0' : 'mt-0.5'} flex-shrink-0 ${selectedIndex === index ? 'text-[#00b6a6]' : 'text-gray-400'}`}>
                    <svg
                      className={isCompact ? "w-4 h-4" : "w-5 h-5"}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`${isCompact ? 'text-sm' : ''} font-semibold truncate ${selectedIndex === index ? 'text-[#006b5f]' : 'text-gray-900'}`}>
                      {prediction.structured_formatting.main_text}
                    </div>
                    <div className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-500 truncate`}>{prediction.structured_formatting.secondary_text}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
