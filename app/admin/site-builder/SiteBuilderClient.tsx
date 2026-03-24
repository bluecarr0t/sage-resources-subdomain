'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Button, Input, Select, Modal, ModalContent } from '@/components/ui';
import {
  Plus,
  Trash2,
  Tent,
  Car,
  ImageIcon,
  Loader2,
  Download,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import {
  resolveAmenityNamesForPrompt,
  resolveGlampingUnitTypeNameForPrompt,
  resolveRvSiteTypeNameForPrompt,
} from '@/lib/site-builder/prompt-display-names';
import { SITE_BUILDER_IMAGE_MODEL_DISPLAY_NAME } from '@/lib/site-builder/site-builder-image-model';
import {
  SCENE_FRAMING_IDS,
  resolveSceneFramingToArchetype,
  type SceneFramingChoice,
} from '@/lib/site-builder/property-scene-archetype';

interface GlampingType {
  slug: string;
  name: string;
  default_sqft: number | null;
  default_diameter_ft: number | null;
  default_quality_type: string | null;
}

interface RVSiteType {
  slug: string;
  name: string;
  width_ft: number | null;
  depth_ft: number | null;
  base_cost_per_site: number;
  hookup_type: string | null;
}

interface AmenitySource {
  report_id: string;
  study_id: string | null;
  report_title: string | null;
  line_item: string;
}

interface AmenityCost {
  slug: string;
  name: string;
  cost_per_unit: number;
  applies_to: string;
  sources?: AmenitySource[];
}

interface ReferenceData {
  glampingTypes: GlampingType[];
  rvSiteTypes: RVSiteType[];
  amenityCosts: AmenityCost[];
}

interface CatalogUnit {
  id: string;
  manufacturer: string | null;
  product_model: string | null;
  unit_link: string | null;
  price: number | null;
  floor_area_sqft: number | null;
  catalog_section: string | null;
}

/** Walden catalog_section → site_builder_glamping_types slug */
const CATALOG_SECTION_TO_UNIT_SLUG: Record<string, string> = {
  'A-Frames': 'a-frame',
  'Converted Containers': 'tiny-home',
  Domes: 'dome',
  'Mirror Cabins': 'mirror-cabin',
  Pods: 'pod',
  Tents: 'safari-tent',
  'Vintage Trailers': 'vintage-trailer',
  Treehouses: 'treehouse',
  Wagons: 'wagon',
  Yurts: 'yurt',
};

function glampingSlugExists(slug: string, glampingTypes: GlampingType[]): boolean {
  return glampingTypes.some((g) => g.slug === slug);
}

function resolveGlampingSlugFromCatalogSection(
  catalogSection: string | null | undefined,
  glampingTypes: GlampingType[]
): string | null {
  if (!catalogSection?.trim()) return null;
  const section = catalogSection.trim();
  const direct = CATALOG_SECTION_TO_UNIT_SLUG[section];
  if (direct && glampingSlugExists(direct, glampingTypes)) return direct;
  const lower = section.toLowerCase();
  for (const [key, slug] of Object.entries(CATALOG_SECTION_TO_UNIT_SLUG)) {
    if (key.toLowerCase() === lower && glampingSlugExists(slug, glampingTypes)) return slug;
  }
  for (const g of glampingTypes) {
    const gn = g.name.trim().toLowerCase();
    if (gn === lower) return g.slug;
    const sectionSingular = lower.replace(/s$/i, '');
    const nameSingular = gn.replace(/s$/i, '');
    if (sectionSingular === nameSingular) return g.slug;
  }
  return null;
}

/**
 * Walden often files yurts and other units under catalog_section "Tents", which would
 * map only to safari-tent. Prefer manufacturer / product_model / section text hints first.
 */
function resolveGlampingSlugForCatalogUnit(
  u: CatalogUnit,
  glampingTypes: GlampingType[]
): string | null {
  if (!glampingTypes.length) return null;
  const h = `${u.manufacturer ?? ''} ${u.product_model ?? ''} ${u.catalog_section ?? ''}`.toLowerCase();

  const trySlug = (slug: string): string | null =>
    glampingSlugExists(slug, glampingTypes) ? slug : null;

  const hints: { test: (text: string) => boolean; slug: string }[] = [
    { test: (x) => x.includes('vintage trailer'), slug: 'vintage-trailer' },
    { test: (x) => x.includes('mirror cabin'), slug: 'mirror-cabin' },
    { test: (x) => x.includes('bell tent'), slug: 'bell-tent' },
    { test: (x) => x.includes('canvas tent'), slug: 'canvas-tent' },
    { test: (x) => x.includes('safari tent'), slug: 'safari-tent' },
    { test: (x) => x.includes('tiny home') || x.includes('tiny house'), slug: 'tiny-home' },
    { test: (x) => x.includes('shipping container'), slug: 'tiny-home' },
    { test: (x) => x.includes('tree house') || x.includes('treehouse'), slug: 'treehouse' },
    { test: (x) => x.includes('a-frame') || x.includes('a frame'), slug: 'a-frame' },
    { test: (x) => /yurt/i.test(x), slug: 'yurt' },
    { test: (x) => /\bairstream\b/i.test(x), slug: 'airstream' },
    { test: (x) => /\bwagon\b/i.test(x), slug: 'wagon' },
    { test: (x) => x.includes('geodesic'), slug: 'dome' },
    { test: (x) => /\bdome\b/i.test(x), slug: 'dome' },
    { test: (x) => /house\s*boat|houseboat/i.test(x), slug: 'house-boat' },
    { test: (x) => /\bpod\b/i.test(x), slug: 'pod' },
    {
      test: (x) => /\bcabin\b/i.test(x) && !x.includes('mirror cabin'),
      slug: 'cabin',
    },
    { test: (x) => /\btipi\b/i.test(x) || /\bteepee\b/i.test(x), slug: 'bell-tent' },
  ];

  for (const { test, slug } of hints) {
    if (test(h)) {
      const s = trySlug(slug);
      if (s) return s;
    }
  }

  return resolveGlampingSlugFromCatalogSection(u.catalog_section, glampingTypes);
}

interface GlampingConfigState {
  id: string;
  type: 'glamping';
  unitTypeSlug: string;
  quantity: number;
  sqft: number;
  qualityType: string;
  amenitySlugs: string[];
  catalogUnitId: string | null;
  catalogUnit: CatalogUnit | null;
}

interface RVConfigState {
  id: string;
  type: 'rv';
  siteTypeSlug: string;
  quantity: number;
  qualityType: string;
  amenitySlugs: string[];
}

type ConfigState = GlampingConfigState | RVConfigState;

interface ConfigCostResult {
  configIndex: number;
  type: 'glamping' | 'rv';
  name: string;
  qualityTier: string | null;
  quantity: number;
  costPerUnit: number;
  subtotal: number;
  baseCost: number;
  amenityCost: number;
}

const QUALITY_OPTIONS = ['Ultra Luxury', 'Luxury', 'Premium', 'Mid-Range', 'Economy', 'Budget'] as const;

function AmenityLabel({
  amenity,
  formatCurrency,
  t,
}: {
  amenity: AmenityCost;
  formatCurrency: (n: number) => string;
  t: (key: string) => string;
}) {
  const hasSources = amenity.sources && amenity.sources.length > 0;
  const sourcesWithStudy = hasSources ? amenity.sources!.filter((s) => s.study_id) : [];

  if (!hasSources || sourcesWithStudy.length === 0) {
    return (
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {amenity.name} ({formatCurrency(amenity.cost_per_unit)})
      </span>
    );
  }

  return (
    <span className="group relative inline-block">
      <span className="text-sm text-gray-700 dark:text-gray-300 cursor-help underline decoration-dotted decoration-sage-400/60 underline-offset-1">
        {amenity.name} ({formatCurrency(amenity.cost_per_unit)})
      </span>
      <span
        role="tooltip"
        className="absolute left-0 bottom-full z-50 mb-1 hidden w-max max-w-[320px] rounded-lg border border-gray-200 bg-white py-2.5 text-left text-xs shadow-lg dark:border-gray-600 dark:bg-gray-800 group-hover:block"
      >
        <div className="px-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{amenity.name}</p>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">{t('sourceReports')} — {formatCurrency(amenity.cost_per_unit)}</p>
        </div>
        <ul className="mt-2 space-y-0 max-h-[260px] overflow-y-auto">
          {sourcesWithStudy.map((s, i) => (
            <li
              key={`${s.report_id}-${s.line_item}-${i}`}
              className="border-b border-gray-50 dark:border-gray-700/50 last:border-0"
            >
              <Link
                href={`/admin/reports/${encodeURIComponent(s.study_id!)}`}
                className="block px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate" title={s.report_title ?? undefined}>
                  {s.report_title || t('unnamedReport')}
                </p>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-[11px]">
                  {s.line_item}
                </p>
                <span className="inline-flex items-center gap-1 mt-1 text-sage-600 dark:text-sage-400 text-[11px] font-medium">
                  <FileText className="w-3 h-3" aria-hidden />
                  {t('viewStudy')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </span>
    </span>
  );
}

/** Map legacy CCE quality values to new display tiers for backward compatibility */
const LEGACY_TO_DISPLAY: Record<string, string> = {
  Excellent: 'Ultra Luxury',
  'Very Good': 'Luxury',
  Good: 'Premium',
  Average: 'Mid-Range',
  Fair: 'Economy',
  'Low cost': 'Budget',
};

function normalizeQualityForDisplay(value: string): string {
  return LEGACY_TO_DISPLAY[value] ?? (QUALITY_OPTIONS.includes(value as (typeof QUALITY_OPTIONS)[number]) ? value : 'Premium');
}

function generateId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `cfg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function buildSharedLandscapeContext(location: string, imageDescription: string): string {
  const locationText = location.trim();
  const descriptionText = imageDescription.trim();
  const parts = [
    'one cohesive property-wide landscape shared across every generated image',
    'same terrain shape, vegetation density, climate cues, season, weather, and time of day',
    'same horizon line and camera perspective style across images',
  ];
  if (locationText) {
    parts.push(`grounded in ${locationText}`);
  }
  if (descriptionText) {
    parts.push(`while honoring these requested details: ${descriptionText}`);
  }
  return parts.join('; ');
}

export default function SiteBuilderClient() {
  const t = useTranslations('siteBuilder');
  const imageBatchStyleHintRaw = t.raw('imageBatchStyleHint') as {
    summary?: string;
    moreInfoLabel?: string;
    intro?: string;
    bullets?: string[];
  };
  const imageBatchStyleHintSummary =
    typeof imageBatchStyleHintRaw?.summary === 'string' ? imageBatchStyleHintRaw.summary.trim() : '';
  const imageBatchStyleHintMoreInfoLabel =
    typeof imageBatchStyleHintRaw?.moreInfoLabel === 'string'
      ? imageBatchStyleHintRaw.moreInfoLabel.trim()
      : '';
  const imageBatchStyleHintIntro =
    typeof imageBatchStyleHintRaw?.intro === 'string' ? imageBatchStyleHintRaw.intro : '';
  const imageBatchStyleHintBullets = Array.isArray(imageBatchStyleHintRaw?.bullets)
    ? imageBatchStyleHintRaw.bullets.filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
    : [];
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [configs, setConfigs] = useState<ConfigState[]>([]);
  const [costResult, setCostResult] = useState<{ configs: ConfigCostResult[]; totalSiteBuild: number } | null>(null);
  const [loadingRef, setLoadingRef] = useState(true);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [location, setLocation] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [sceneFramingChoice, setSceneFramingChoice] = useState<SceneFramingChoice>('auto');
  const [generatedImages, setGeneratedImages] = useState<{ configName: string; imageBase64: string; mediaType: string }[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageGenerationNotice, setImageGenerationNotice] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{
    configName: string;
    imageBase64: string;
    mediaType: string;
  } | null>(null);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [docxExportError, setDocxExportError] = useState<string | null>(null);
  const [catalogSearchOpen, setCatalogSearchOpen] = useState<string | null>(null);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [catalogSearchResults, setCatalogSearchResults] = useState<CatalogUnit[]>([]);
  const [catalogSearchLoading, setCatalogSearchLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/site-builder/reference-data')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReferenceData({
            glampingTypes: data.glampingTypes,
            rvSiteTypes: data.rvSiteTypes,
            amenityCosts: data.amenityCosts,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoadingRef(false));
  }, []);

  /** Re-resolve unit type when reference data loads (e.g. yurt under Walden "Tents" section). */
  useEffect(() => {
    const types = referenceData?.glampingTypes;
    if (!types?.length) return;
    setConfigs((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        if (c.type !== 'glamping' || !c.catalogUnit) return c;
        const resolved = resolveGlampingSlugForCatalogUnit(c.catalogUnit, types);
        if (resolved && resolved !== c.unitTypeSlug) {
          changed = true;
          return { ...c, unitTypeSlug: resolved };
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [referenceData]);

  const resolvedPropertySceneArchetype = useMemo(
    () =>
      resolveSceneFramingToArchetype(
        sceneFramingChoice,
        configs.map((c) => ({ type: c.type }))
      ),
    [sceneFramingChoice, configs]
  );

  const hasCatalogLinkedRow = useMemo(
    () =>
      configs.some((c) => c.type === 'glamping' && Boolean(c.catalogUnitId && c.catalogUnit)),
    [configs]
  );

  /** Feasibility .docx shell: glamping-only rows use glamping template; RV-only or mixed use RV. */
  const docxTemplateKey = useMemo((): 'rv' | 'glamping' => {
    const hasG = configs.some((c) => c.type === 'glamping');
    const hasR = configs.some((c) => c.type === 'rv');
    if (hasG && !hasR) return 'glamping';
    return 'rv';
  }, [configs]);

  const fetchCatalogUnits = useCallback(async (search: string) => {
    setCatalogSearchLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '20', sort_by: 'product_model', sort_dir: 'asc' });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/cce-catalog-units?${params}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.rows)) {
        setCatalogSearchResults(
          data.rows.map((r: { id: string; manufacturer?: string | null; product_model?: string | null; unit_link?: string | null; price?: number | null; floor_area_sqft?: number | null; catalog_section?: string | null }) => ({
            id: r.id,
            manufacturer: r.manufacturer ?? null,
            product_model: r.product_model ?? null,
            unit_link: r.unit_link ?? null,
            price: r.price != null ? Number(r.price) : null,
            floor_area_sqft: r.floor_area_sqft != null ? Number(r.floor_area_sqft) : null,
            catalog_section: r.catalog_section ?? null,
          }))
        );
      } else {
        setCatalogSearchResults([]);
      }
    } catch {
      setCatalogSearchResults([]);
    } finally {
      setCatalogSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!catalogSearchOpen) return;
    const t = setTimeout(() => fetchCatalogUnits(catalogSearchTerm), 300);
    return () => clearTimeout(t);
  }, [catalogSearchOpen, catalogSearchTerm, fetchCatalogUnits]);

  useEffect(() => {
    if (configs.length === 0) {
      setCostResult(null);
      return;
    }
    const payload = {
      configs: configs.map((c) => {
        if (c.type === 'glamping') {
          return {
            type: 'glamping',
            unitTypeSlug: c.unitTypeSlug,
            quantity: c.quantity,
            sqft: c.sqft,
            qualityType: c.qualityType,
            amenitySlugs: c.amenitySlugs,
            catalogUnitId: c.catalogUnitId ?? null,
          };
        }
        return {
          type: 'rv',
          siteTypeSlug: c.siteTypeSlug,
          quantity: c.quantity,
          qualityType: c.qualityType,
          amenitySlugs: c.amenitySlugs,
        };
      }),
    };
    setLoadingCosts(true);
    fetch('/api/admin/site-builder/costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCostResult({ configs: data.configs, totalSiteBuild: data.totalSiteBuild });
        } else {
          setCostResult(null);
        }
      })
      .catch(() => setCostResult(null))
      .finally(() => setLoadingCosts(false));
  }, [configs]);

  const addGlampingConfig = useCallback(() => {
    const first = referenceData?.glampingTypes[0];
    setConfigs((prev) => [
      ...prev,
      {
        id: generateId(),
        type: 'glamping',
        unitTypeSlug: first?.slug ?? '',
        quantity: 5,
        sqft: first?.default_sqft ?? 500,
        qualityType: first?.default_quality_type ?? 'Premium',
        amenitySlugs: [],
        catalogUnitId: null,
        catalogUnit: null,
      },
    ]);
  }, [referenceData]);

  const addRVConfig = useCallback(() => {
    const first = referenceData?.rvSiteTypes[0];
    setConfigs((prev) => [
      ...prev,
      {
        id: generateId(),
        type: 'rv',
        siteTypeSlug: first?.slug ?? '',
        quantity: 50,
        qualityType: 'Premium',
        amenitySlugs: [],
      },
    ]);
  }, [referenceData]);

  const removeConfig = useCallback((id: string) => {
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateGlampingConfig = useCallback(
    (id: string, field: keyof GlampingConfigState, value: string | number | string[] | CatalogUnit | null) => {
      setConfigs((prev) =>
        prev.map((c) =>
          c.id === id && c.type === 'glamping'
            ? { ...c, [field]: value }
            : c
        )
      );
    },
    []
  );

  const clearCatalogUnit = useCallback((configId: string) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === configId && c.type === 'glamping'
          ? { ...c, catalogUnitId: null, catalogUnit: null }
          : c
      )
    );
  }, []);

  const applyCatalogUnitToGlampingConfig = useCallback(
    (configId: string, u: CatalogUnit) => {
      const types = referenceData?.glampingTypes ?? [];
      setConfigs((prev) =>
        prev.map((c) => {
          if (c.id !== configId || c.type !== 'glamping') return c;
          const fromCatalog = resolveGlampingSlugForCatalogUnit(u, types);
          const unitTypeSlug = fromCatalog ?? c.unitTypeSlug;
          return {
            ...c,
            catalogUnitId: u.id,
            catalogUnit: u,
            sqft: u.floor_area_sqft != null ? u.floor_area_sqft : c.sqft,
            unitTypeSlug,
          };
        })
      );
      setCatalogSearchOpen(null);
      setCatalogSearchTerm('');
    },
    [referenceData?.glampingTypes]
  );

  const updateRVConfig = useCallback((id: string, field: keyof RVConfigState, value: string | number | string[]) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === id && c.type === 'rv'
          ? { ...c, [field]: value }
          : c
      )
    );
  }, []);

  const buildConfigForPrompt = useCallback(
    (
      config: ConfigState
    ): {
      config: {
        type: 'glamping' | 'rv';
        unitTypeName?: string;
        siteTypeName?: string;
        sqft?: number;
        diameterFt?: number;
        qualityType?: string;
        amenityNames: string[];
        productLink?: string;
      };
      configName: string;
      catalogUnitId?: string;
    } | null => {
      if (config.type === 'glamping') {
        const catalogUnit = config.catalogUnit;
        const gt = referenceData?.glampingTypes.find((g) => g.slug === config.unitTypeSlug);
        const unitName = resolveGlampingUnitTypeNameForPrompt({
          unitTypeSlug: config.unitTypeSlug,
          catalogUnit,
          glampingTypes: referenceData?.glampingTypes ?? [],
        });
        const amenityNames = resolveAmenityNamesForPrompt(
          config.amenitySlugs || [],
          referenceData?.amenityCosts ?? []
        );
        const qualityForDisplay = normalizeQualityForDisplay(config.qualityType);
        if (!unitName.trim()) return null;
        return {
          config: {
            type: 'glamping',
            unitTypeName: unitName,
            sqft: catalogUnit?.floor_area_sqft ?? config.sqft,
            diameterFt: gt?.default_diameter_ft ?? undefined,
            qualityType: qualityForDisplay,
            amenityNames,
            productLink: catalogUnit?.unit_link ?? undefined,
          },
          configName: unitName,
          ...(catalogUnit?.id ? { catalogUnitId: catalogUnit.id } : {}),
        };
      }
      const siteTypeName = resolveRvSiteTypeNameForPrompt(
        config.siteTypeSlug,
        referenceData?.rvSiteTypes ?? []
      );
      if (!String(siteTypeName).trim()) return null;
      const amenityNames = resolveAmenityNamesForPrompt(
        config.amenitySlugs || [],
        referenceData?.amenityCosts ?? []
      );
      return {
        config: {
          type: 'rv',
          siteTypeName,
          qualityType: normalizeQualityForDisplay(config.qualityType),
          amenityNames,
        },
        configName: siteTypeName,
        catalogUnitId: undefined,
      };
    },
    [referenceData]
  );

  const handleGenerateImages = useCallback(async () => {
    if (configs.length === 0) return;
    setGeneratingImages(true);
    setGeneratedImages([]);
    setImageGenerationNotice(null);
    setDocxExportError(null);
    try {
      const paired = configs.map((config) => ({ config, built: buildConfigForPrompt(config) }));
      const skippedRows = paired
        .map((p, index) => ({ index: index + 1, config: p.config, built: p.built }))
        .filter((p) => p.built == null);
      const builtConfigs = paired
        .map((p) => p.built)
        .filter(
          (
            built
          ): built is {
            config: {
              type: 'glamping' | 'rv';
              unitTypeName?: string;
              siteTypeName?: string;
              sqft?: number;
              diameterFt?: number;
              qualityType?: string;
              amenityNames: string[];
              productLink?: string;
            };
            configName: string;
            catalogUnitId?: string;
          } => built != null
        );
      const noticeParts: string[] = [];
      if (skippedRows.length > 0) {
        noticeParts.push(
          `Skipped ${skippedRows.length} row(s) with no unit/site type selected (row #${skippedRows.map((s) => s.index).join(', #')}).`
        );
      }
      if (builtConfigs.length === 0) {
        if (noticeParts.length) setImageGenerationNotice(noticeParts.join(' '));
        return;
      }
      const batchTotal = builtConfigs.length;
      const sharedLandscapeContext =
        batchTotal > 1 ? buildSharedLandscapeContext(location, imageDescription) : undefined;

      /** Sequential generation so each image after the first can use the prior render as a visual reference. */
      const results: { configName: string; imageBase64: string; mediaType: string }[] = [];
      const generationFailures: string[] = [];
      let referenceImageBase64: string | undefined;
      let referenceMediaType: string | undefined;
      let batchContinuityBroken = false;

      for (let batchPosition = 0; batchPosition < builtConfigs.length; batchPosition++) {
        const built = builtConfigs[batchPosition]!;
        const body: Record<string, unknown> = {
          config: built.config,
          location: location.trim() || undefined,
          imageDescription: imageDescription.trim() || undefined,
          sharedLandscapeContext,
          batchPosition,
          batchTotal,
          aspectRatio: '4:3',
          timeOfDay: 'midday',
          propertySceneArchetype: resolvedPropertySceneArchetype,
        };
        if (batchTotal > 1 && batchPosition > 0 && referenceImageBase64) {
          body.referenceImageBase64 = referenceImageBase64;
          body.referenceMediaType = referenceMediaType;
        }
        if (built.catalogUnitId) {
          body.catalogUnitId = built.catalogUnitId;
        }
        const res = await fetch('/api/admin/site-builder/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success && data.imageBase64) {
          const mediaType: string = data.mediaType ?? 'image/png';
          referenceImageBase64 = data.imageBase64;
          referenceMediaType = mediaType;
          results.push({
            configName: built.configName,
            imageBase64: data.imageBase64,
            mediaType,
          });
        } else {
          referenceImageBase64 = undefined;
          referenceMediaType = undefined;
          batchContinuityBroken = true;
          const errMsg = typeof data.error === 'string' ? data.error : res.ok ? 'No image returned' : 'Request failed';
          generationFailures.push(`${built.configName}: ${errMsg}`);
        }
      }
      if (generationFailures.length > 0) {
        noticeParts.push(
          `${generationFailures.length} image(s) failed: ${generationFailures.join('; ')}.`
        );
      } else if (results.length < builtConfigs.length) {
        noticeParts.push(`Only ${results.length} of ${builtConfigs.length} images were generated.`);
      }
      if (batchContinuityBroken && batchTotal > 1) {
        noticeParts.push(t('imageBatchContinuityResetNote'));
      }
      if (noticeParts.length) setImageGenerationNotice(noticeParts.join(' '));
      setGeneratedImages(results);
    } catch (err) {
      console.error('Image generation failed:', err);
    } finally {
      setGeneratingImages(false);
    }
  }, [
    configs,
    buildConfigForPrompt,
    location,
    imageDescription,
    resolvedPropertySceneArchetype,
    t,
  ]);

  const handleExportImagesDocx = useCallback(async () => {
    if (generatedImages.length === 0) return;
    setExportingDocx(true);
    setDocxExportError(null);
    try {
      const res = await fetch('/api/admin/site-builder/export-images-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: docxTemplateKey,
          images: generatedImages.map((img) => ({
            configName: img.configName,
            imageBase64: img.imageBase64,
            mediaType: img.mediaType,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === 'string' ? data.error : res.statusText);
      }
      const blob = await res.blob();
      const disp = res.headers.get('content-disposition');
      const match = disp?.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? `site-builder-images-${docxTemplateKey}.docx`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('DOCX export failed:', err);
      setDocxExportError(t('exportImagesDocxError'));
    } finally {
      setExportingDocx(false);
    }
  }, [generatedImages, docxTemplateKey, t]);

  const handleExportXlsx = useCallback(async () => {
    if (configs.length === 0) return;
    setExportingXlsx(true);
    try {
      const payload = {
        configs: configs.map((c) => {
          if (c.type === 'glamping') {
            return {
              type: 'glamping',
              unitTypeSlug: c.unitTypeSlug,
              quantity: c.quantity,
              sqft: c.sqft,
              qualityType: c.qualityType,
              amenitySlugs: c.amenitySlugs,
              catalogUnitId: c.catalogUnitId ?? null,
            };
          }
          return {
            type: 'rv',
            siteTypeSlug: c.siteTypeSlug,
            quantity: c.quantity,
            qualityType: c.qualityType,
            amenitySlugs: c.amenitySlugs,
          };
        }),
      };
      const res = await fetch('/api/admin/site-builder/export-xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Export failed');
      }
      const blob = await res.blob();
      const disp = res.headers.get('content-disposition');
      const match = disp?.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? 'site-builder-cost-analysis.xlsx';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportingXlsx(false);
    }
  }, [configs]);

  const toggleAmenity = useCallback((configId: string, configType: 'glamping' | 'rv', slug: string) => {
    setConfigs((prev) =>
      prev.map((c) => {
        if (c.id !== configId) return c;
        const applies = configType === 'glamping' ? ['glamping', 'both'] : ['rv', 'both'];
        const amenity = referenceData?.amenityCosts.find((a) => a.slug === slug);
        if (!amenity || !applies.includes(amenity.applies_to)) return c;
        const current = c.amenitySlugs;
        const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
        return { ...c, amenitySlugs: next };
      })
    );
  }, [referenceData]);

  const canGenerateImages = useMemo(() => {
    if (configs.length === 0) return false;
    return configs.some((c) => {
      if (c.type === 'glamping') {
        return Boolean((c.catalogUnitId && c.catalogUnit) || c.unitTypeSlug?.trim());
      }
      return Boolean(c.siteTypeSlug?.trim());
    });
  }, [configs]);

  if (loadingRef) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
      </div>
    );
  }

  const glampingAmenities = referenceData?.amenityCosts.filter((a) => a.applies_to === 'glamping' || a.applies_to === 'both') ?? [];
  const rvAmenities = referenceData?.amenityCosts.filter((a) => a.applies_to === 'rv' || a.applies_to === 'both') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={addGlampingConfig}
          className="inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <Tent className="w-4 h-4" />
          {t('addGlamping')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={addRVConfig}
          className="inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <Car className="w-4 h-4" />
          {t('addRVSite')}
        </Button>
      </div>

      <div className="space-y-4">
        {configs.map((config, index) =>
          config.type === 'glamping' ? (
            <div key={config.id} className="relative">
              <span
                className="absolute top-0 left-0 z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-br bg-sage-600 text-xs font-semibold text-white shadow-sm"
                aria-hidden
              >
                {index + 1}
              </span>
              <Card padding="md" className="border border-gray-200 dark:border-gray-700 pl-10">
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-[165px] shrink-0">
                  <Select
                    label={t('unitType')}
                    value={config.unitTypeSlug}
                    onChange={(e) => updateGlampingConfig(config.id, 'unitTypeSlug', e.target.value)}
                    disabled={config.catalogUnit != null}
                    className={
                      config.catalogUnit != null
                        ? 'cursor-not-allowed disabled:!opacity-100 disabled:bg-white dark:disabled:bg-gray-700 disabled:text-gray-900 dark:disabled:text-gray-100'
                        : undefined
                    }
                    title={config.catalogUnit ? t('unitTypeFromCatalog') : undefined}
                  >
                    <option value="">{t('selectUnitType')}</option>
                    {referenceData?.glampingTypes.map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-[88px] shrink-0">
                  <Input
                    label={t('quantity')}
                    type="number"
                    min={1}
                    value={config.quantity}
                    onChange={(e) => updateGlampingConfig(config.id, 'quantity', parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="w-[88px] shrink-0">
                  <Input
                    label={t('sqft')}
                    type="number"
                    min={1}
                    value={config.catalogUnit?.floor_area_sqft ?? config.sqft}
                    onChange={(e) => updateGlampingConfig(config.id, 'sqft', parseInt(e.target.value, 10) || 0)}
                    disabled={config.catalogUnit != null && config.catalogUnit.floor_area_sqft != null}
                    className={
                      config.catalogUnit != null && config.catalogUnit.floor_area_sqft != null
                        ? 'disabled:!opacity-100'
                        : undefined
                    }
                    tooltip={
                      config.catalogUnit?.floor_area_sqft != null
                        ? t('sqftFromCatalog')
                        : undefined
                    }
                  />
                </div>
                <div className="w-[150px] shrink-0">
                  <Select
                    label={t('qualityType')}
                    value={normalizeQualityForDisplay(config.qualityType)}
                    onChange={(e) => updateGlampingConfig(config.id, 'qualityType', e.target.value)}
                    disabled={config.catalogUnit != null}
                    className={
                      config.catalogUnit != null
                        ? 'cursor-not-allowed disabled:!opacity-100 disabled:bg-white dark:disabled:bg-gray-700 disabled:text-gray-900 dark:disabled:text-gray-100'
                        : undefined
                    }
                    title={config.catalogUnit ? t('qualityTierFromCatalog') : undefined}
                  >
                    {QUALITY_OPTIONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </Select>
                </div>
                <div
                  className={
                    catalogSearchOpen === config.id
                      ? 'flex-1 flex flex-col gap-1 min-w-[200px]'
                      : 'shrink-0 flex flex-col gap-1'
                  }
                >
                  {!catalogSearchOpen && (
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('unitManufacturers')}
                    </label>
                  )}
                  {config.catalogUnit ? (
                    <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-sage-50 dark:bg-sage-900/30 border border-sage-200 dark:border-sage-700">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {[config.catalogUnit.manufacturer, config.catalogUnit.product_model].filter(Boolean).join(' ')}
                      </span>
                      {config.catalogUnit.price != null && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatCurrency(config.catalogUnit.price)}
                        </span>
                      )}
                      {config.catalogUnit.unit_link && (
                        <a
                          href={config.catalogUnit.unit_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-sage-600 hover:text-sage-700 dark:text-sage-400"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {t('viewProduct')}
                        </a>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => clearCatalogUnit(config.id)}
                        aria-label={t('clearCatalogUnit')}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : catalogSearchOpen === config.id ? (
                    <div className="relative w-full min-w-[200px]">
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('unitManufacturers')}
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 min-w-[180px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder={t('catalogSearchPlaceholder')}
                            value={catalogSearchTerm}
                            onChange={(e) => setCatalogSearchTerm(e.target.value)}
                            className="pl-9"
                            autoFocus
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCatalogSearchOpen(null);
                            setCatalogSearchTerm('');
                          }}
                        >
                          {t('cancel')}
                        </Button>
                      </div>
                      <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
                        {catalogSearchLoading ? (
                          <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p>
                        ) : catalogSearchResults.length > 0 ? (
                          <ul className="max-h-48 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-600">
                            {catalogSearchResults.map((u) => (
                              <li key={u.id}>
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-sage-50 dark:hover:bg-sage-900/30 flex items-center justify-between gap-2"
                                  onClick={() => applyCatalogUnitToGlampingConfig(config.id, u)}
                                >
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {[u.manufacturer, u.product_model].filter(Boolean).join(' ') || u.id}
                                  </span>
                                  {u.price != null && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">
                                      {formatCurrency(u.price)}
                                    </span>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{t('noCatalogUnits')}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCatalogSearchOpen(config.id);
                        setCatalogSearchTerm('');
                        fetchCatalogUnits('');
                      }}
                      className="inline-flex items-center gap-2 min-w-[220px]"
                    >
                      <Search className="w-4 h-4" />
                      {t('selectCatalogUnit')}
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeConfig(config.id)}
                  aria-label={t('remove')}
                  className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('amenities')}</p>
                <div className="flex flex-wrap gap-3">
                  {glampingAmenities.map((a) => (
                    <label key={a.slug} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.amenitySlugs.includes(a.slug)}
                        onChange={() => toggleAmenity(config.id, 'glamping', a.slug)}
                        className="rounded border-gray-300 dark:border-gray-600 text-sage-600 focus:ring-sage-500"
                      />
                      <AmenityLabel amenity={a} formatCurrency={formatCurrency} t={t} />
                      {a.sources?.length ? (
                        <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {a.sources
                            .filter((s) => s.study_id)
                            .map((s, i) => (
                              <Link
                                key={`${s.report_id}-${s.line_item}-${i}`}
                                href={`/admin/reports/${encodeURIComponent(s.study_id!)}`}
                                className="inline-flex text-sage-600 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300"
                                title={s.report_title ? `${s.report_title} — ${s.line_item}` : s.line_item}
                                aria-label={t('viewStudy')}
                              >
                                <FileText className="w-3.5 h-3.5" aria-hidden />
                              </Link>
                            ))}
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
              </div>
            </Card>
            </div>
          ) : (
            <div key={config.id} className="relative">
              <span
                className="absolute top-0 left-0 z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-br bg-sage-600 text-xs font-semibold text-white shadow-sm"
                aria-hidden
              >
                {index + 1}
              </span>
              <Card padding="md" className="border border-gray-200 dark:border-gray-700 pl-10">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="w-[280px] shrink-0">
                  <Select
                    label={t('siteType')}
                    value={config.siteTypeSlug}
                    onChange={(e) => updateRVConfig(config.id, 'siteTypeSlug', e.target.value)}
                  >
                    <option value="">{t('selectSiteType')}</option>
                    {referenceData?.rvSiteTypes.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-[88px] shrink-0">
                  <Input
                    label={t('quantity')}
                    type="number"
                    min={1}
                    value={config.quantity}
                    onChange={(e) => updateRVConfig(config.id, 'quantity', parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="w-[150px] shrink-0">
                  <Select
                    label={t('qualityType')}
                    value={normalizeQualityForDisplay(config.qualityType)}
                    onChange={(e) => updateRVConfig(config.id, 'qualityType', e.target.value)}
                  >
                    {QUALITY_OPTIONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-[165px] shrink-0">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('costPerSite')}
                  </label>
                  <p className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100">
                    {loadingCosts ? t('calculating') : costResult?.configs[index] != null ? formatCurrency(costResult.configs[index].costPerUnit) : '—'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeConfig(config.id)}
                  aria-label={t('remove')}
                  className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('amenities')}</p>
                <div className="flex flex-wrap gap-3">
                  {rvAmenities.map((a) => (
                    <label key={a.slug} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.amenitySlugs.includes(a.slug)}
                        onChange={() => toggleAmenity(config.id, 'rv', a.slug)}
                        className="rounded border-gray-300 dark:border-gray-600 text-sage-600 focus:ring-sage-500"
                      />
                      <AmenityLabel amenity={a} formatCurrency={formatCurrency} t={t} />
                      {a.sources?.length ? (
                        <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {a.sources
                            .filter((s) => s.study_id)
                            .map((s, i) => (
                              <Link
                                key={`${s.report_id}-${s.line_item}-${i}`}
                                href={`/admin/reports/${encodeURIComponent(s.study_id!)}`}
                                className="inline-flex text-sage-600 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-300"
                                title={s.report_title ? `${s.report_title} — ${s.line_item}` : s.line_item}
                                aria-label={t('viewStudy')}
                              >
                                <FileText className="w-3.5 h-3.5" aria-hidden />
                              </Link>
                            ))}
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
              </div>
            </Card>
            </div>
          )
        )}
      </div>

      {configs.length > 0 && (
        <Card padding="md">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('costSummary')}</h2>
          {loadingCosts ? (
            <p className="text-gray-500 dark:text-gray-400">{t('calculating')}</p>
          ) : costResult ? (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">{t('type')}</th>
                      <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">{t('config')}</th>
                      <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">{t('qualityTierColumn')}</th>
                      <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">{t('quantity')}</th>
                      <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">{t('costPerUnit')}</th>
                      <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">{t('subtotal')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costResult.configs.map((r) => (
                      <tr key={r.configIndex} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 text-gray-700 dark:text-gray-300">
                          {r.type === 'rv' ? t('typeRv') : t('typeGlamping')}
                        </td>
                        <td className="py-2 text-gray-900 dark:text-gray-100">{r.name}</td>
                        <td className="py-2 text-gray-700 dark:text-gray-300">{r.qualityTier ?? t('notApplicable')}</td>
                        <td className="text-right py-2 text-gray-700 dark:text-gray-300">{r.quantity}</td>
                        <td className="text-right py-2 text-gray-700 dark:text-gray-300">{formatCurrency(r.costPerUnit)}</td>
                        <td className="text-right py-2 font-medium text-gray-900 dark:text-gray-100">{formatCurrency(r.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pt-3 border-t border-gray-200 dark:border-gray-600 flex flex-wrap items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleExportXlsx}
                  disabled={exportingXlsx}
                  className="inline-flex items-center gap-2"
                >
                  {exportingXlsx ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('exporting')}
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      {t('exportToExcel')}
                    </>
                  )}
                </Button>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('totalSiteBuild')}: {formatCurrency(costResult.totalSiteBuild)}
                </p>
              </div>
            </div>
          ) : null}
        </Card>
      )}

      {configs.length > 0 && (
        <Card padding="md">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('generateImages')}</h2>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
            <div className="space-y-4 flex-1 min-w-0">
              <div className="max-w-md space-y-1">
                <Input
                  label={t('location')}
                  placeholder={t('locationPlaceholder')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('imageLocationHelp')}</p>
              </div>
              <div className="max-w-md space-y-1">
                <Select
                  label={t('sceneFramingLabel')}
                  value={sceneFramingChoice}
                  onChange={(e) => setSceneFramingChoice(e.target.value as SceneFramingChoice)}
                >
                  {SCENE_FRAMING_IDS.map((id) => (
                    <option key={id} value={id}>
                      {t(`sceneFraming_${id}`)}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('sceneFramingHelp')}</p>
              </div>
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('imageDescriptionLabel')}
                </label>
                <textarea
                  placeholder={t('imageDescriptionPlaceholder')}
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-600 focus:border-transparent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-y"
                />
              </div>
              {imageBatchStyleHintSummary || imageBatchStyleHintIntro || imageBatchStyleHintBullets.length > 0 ? (
                <div className="max-w-xl text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  {imageBatchStyleHintSummary ? <p>{imageBatchStyleHintSummary}</p> : null}
                  {imageBatchStyleHintMoreInfoLabel ? (
                    <details className="group rounded-md border border-gray-200 bg-gray-50/80 px-3 py-2 dark:border-gray-600 dark:bg-gray-800/40">
                      <summary className="cursor-pointer list-none text-sage-700 underline-offset-2 hover:underline dark:text-sage-400 [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-1">
                          {imageBatchStyleHintMoreInfoLabel}
                          <ChevronDown
                            className="h-3.5 w-3.5 shrink-0 text-gray-400 group-open:hidden dark:text-gray-500"
                            aria-hidden
                          />
                          <ChevronUp
                            className="hidden h-3.5 w-3.5 shrink-0 text-gray-400 group-open:inline dark:text-gray-500"
                            aria-hidden
                          />
                        </span>
                      </summary>
                      <div className="mt-3 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-600">
                        {imageBatchStyleHintIntro ? <p>{imageBatchStyleHintIntro}</p> : null}
                        {imageBatchStyleHintBullets.length > 0 ? (
                          <ul className="list-disc list-outside space-y-1.5 pl-5 marker:text-gray-500 dark:marker:text-gray-400">
                            {imageBatchStyleHintBullets.map((line, idx) => (
                              <li key={idx}>{line}</li>
                            ))}
                          </ul>
                        ) : null}
                        <p>{t('imageReproducibilityNote')}</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {t('imageModelLine', { model: SITE_BUILDER_IMAGE_MODEL_DISPLAY_NAME })}
                        </p>
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}
              {hasCatalogLinkedRow ? (
                <p className="max-w-xl text-sm text-gray-600 dark:text-gray-400">{t('imageCatalogIllustrativeNote')}</p>
              ) : null}
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('generateImagesDescription')}</p>
              <Button
                type="button"
                onClick={handleGenerateImages}
                disabled={generatingImages || !canGenerateImages}
                className="inline-flex items-center gap-2"
              >
                {generatingImages ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    {t('generateImages')}
                  </>
                )}
              </Button>
              {imageGenerationNotice ? (
                <div
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/60 dark:bg-amber-950/40"
                  role="alert"
                >
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    {t('imageGenerationIssuesTitle')}
                  </p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{imageGenerationNotice}</p>
                </div>
              ) : null}
            </div>
            {generatedImages.length > 0 && (
              <div className="relative min-w-0 flex-1 pb-16 sm:pb-14">
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {generatedImages.map((img, i) => (
                    <div
                      key={i}
                      className="flex h-fit flex-col rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                      <button
                        type="button"
                        onClick={() => setImagePreview(img)}
                        className="relative block w-full h-48 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                        aria-label={t('viewImageFullSize')}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`data:${img.mediaType};base64,${img.imageBase64}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                      <div className="p-2 flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800">
                        <div className="w-full flex flex-col items-start gap-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-normal break-words leading-snug">
                            {img.configName}
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                              const ext = img.mediaType?.includes('png') ? 'png' : 'jpg';
                              const a = document.createElement('a');
                              a.href = `data:${img.mediaType};base64,${img.imageBase64}`;
                              a.download = `${img.configName.replace(/\s+/g, '-')}.${ext}`;
                              a.click();
                            }}
                          >
                            <Download className="w-4 h-4" />
                            {t('downloadImage')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-0 right-0 flex flex-col items-end gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="inline-flex items-center gap-2 shadow-sm"
                    disabled={exportingDocx}
                    onClick={() => void handleExportImagesDocx()}
                  >
                    {exportingDocx ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('exportingDocx')}
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        {t('exportImagesDocx')}
                      </>
                    )}
                  </Button>
                  {docxExportError ? (
                    <p className="max-w-xs text-right text-xs text-red-600 dark:text-red-400">{docxExportError}</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Modal open={imagePreview != null} onClose={() => setImagePreview(null)} className="max-w-5xl">
        <ModalContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          {imagePreview ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-2">
                  {imagePreview.configName}
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setImagePreview(null)}
                  aria-label={t('closeImagePreview')}
                >
                  <X className="h-4 w-4" aria-hidden />
                  {t('closeImagePreview')}
                </Button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${imagePreview.mediaType};base64,${imagePreview.imageBase64}`}
                alt={imagePreview.configName}
                className="mx-auto max-h-[min(75vh,880px)] w-full rounded-md object-contain bg-gray-100 dark:bg-gray-900"
              />
            </>
          ) : null}
        </ModalContent>
      </Modal>
    </div>
  );
}
