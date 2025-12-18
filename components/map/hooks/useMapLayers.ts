import { useEffect, useState, useRef } from 'react';
import { PopulationLookup } from '@/lib/population/parse-population-csv';
import { fetchPopulationDataFromSupabase, PopulationDataByFIPS } from '@/lib/population/supabase-population';
import { fetchGDPDataFromSupabase, GDPDataByFIPS } from '@/lib/gdp/supabase-gdp';

// Lazy import Supabase to avoid initialization during build time
async function getSupabaseClient() {
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

interface UseMapLayersProps {
  showPopulationLayer: boolean;
  showGDPLayer: boolean;
  populationYear: '2010' | '2020';
}

/**
 * Hook to manage map layers (Population, GDP, Opportunity Zones)
 */
export function useMapLayers({
  showPopulationLayer,
  showGDPLayer,
  populationYear,
}: UseMapLayersProps) {
  const [populationLookup, setPopulationLookup] = useState<PopulationLookup | null>(null);
  const [populationFipsLookup, setPopulationFipsLookup] = useState<PopulationDataByFIPS | null>(null);
  const [populationLoading, setPopulationLoading] = useState(false);
  const [populationLayerKey, setPopulationLayerKey] = useState(0);
  const [gdpLookup, setGdpLookup] = useState<GDPDataByFIPS | null>(null);
  const [gdpLoading, setGdpLoading] = useState(false);
  const [gdpLayerKey, setGdpLayerKey] = useState(0);

  // Increment population layer key when toggled on
  const prevShowPopulationLayerRef = useRef(showPopulationLayer);
  useEffect(() => {
    if (showPopulationLayer && !prevShowPopulationLayerRef.current) {
      setPopulationLayerKey(prev => prev + 1);
    }
    prevShowPopulationLayerRef.current = showPopulationLayer;
  }, [showPopulationLayer]);

  // Fetch population data from Supabase only when layer is enabled
  useEffect(() => {
    if (!showPopulationLayer) {
      return;
    }

    if (populationLookup) {
      return;
    }

    async function loadPopulationData() {
      setPopulationLoading(true);
      try {
        console.log('Loading population data from Supabase...');
        const { lookup, fipsLookup } = await fetchPopulationDataFromSupabase();
        setPopulationLookup(lookup);
        setPopulationFipsLookup(fipsLookup);
      } catch (err) {
        console.error('Error loading population data from Supabase:', err);
      } finally {
        setPopulationLoading(false);
      }
    }

    loadPopulationData();
  }, [showPopulationLayer, populationLookup]);

  // Increment GDP layer key when toggled on
  const prevShowGDPLayerRef = useRef(showGDPLayer);
  useEffect(() => {
    if (showGDPLayer && !prevShowGDPLayerRef.current) {
      setGdpLayerKey(prev => prev + 1);
    }
    prevShowGDPLayerRef.current = showGDPLayer;
  }, [showGDPLayer]);

  // Fetch GDP data from Supabase only when layer is enabled
  useEffect(() => {
    if (!showGDPLayer) {
      return;
    }

    if (gdpLookup) {
      return;
    }

    async function loadGDPData() {
      setGdpLoading(true);
      try {
        console.log('Loading GDP data from Supabase...');
        const lookup = await fetchGDPDataFromSupabase();
        setGdpLookup(lookup);
      } catch (err) {
        console.error('Error loading GDP data from Supabase:', err);
      } finally {
        setGdpLoading(false);
      }
    }

    loadGDPData();
  }, [showGDPLayer, gdpLookup]);

  return {
    populationLookup,
    populationFipsLookup,
    populationLoading,
    populationLayerKey,
    gdpLookup,
    gdpLoading,
    gdpLayerKey,
  };
}
