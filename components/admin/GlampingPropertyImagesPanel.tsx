'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ImageIcon, Loader2, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { GlampingPropertyImageListItem } from '@/lib/types/glamping-property-images';

interface GlampingPropertyImagesPanelProps {
  propertyId: string;
  disabled?: boolean;
}

export function GlampingPropertyImagesPanel({
  propertyId,
  disabled = false,
}: GlampingPropertyImagesPanelProps) {
  const t = useTranslations('admin.sageData.propertyImages');
  const [images, setImages] = useState<GlampingPropertyImageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const basePath = `/api/admin/sage-glamping-data/properties/${encodeURIComponent(propertyId)}/images`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(basePath, { cache: 'no-store' });
      const json = (await res.json()) as {
        success?: boolean;
        images?: GlampingPropertyImageListItem[];
        error?: string;
      };
      if (!res.ok || !json.success || !Array.isArray(json.images)) {
        throw new Error(json.error || t('loadError'));
      }
      setImages(json.images);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('loadError'));
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [basePath, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || disabled || uploading) return;

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'gallery');
      const res = await fetch(basePath, { method: 'POST', body: fd });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('uploadError'));
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const setHero = async (imageId: string) => {
    if (disabled || busyId) return;
    setBusyId(imageId);
    setError(null);
    try {
      const res = await fetch(basePath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, setHero: true }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('heroError'));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('heroError'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (imageId: string) => {
    if (disabled || busyId) return;
    if (!globalThis.confirm(t('deleteConfirm'))) return;
    setBusyId(imageId);
    setError(null);
    try {
      const res = await fetch(`${basePath}?imageId=${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || t('deleteError'));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('deleteError'));
    } finally {
      setBusyId(null);
    }
  };

  const move = async (imageId: string, direction: -1 | 1) => {
    if (disabled || busyId) return;
    const idx = images.findIndex((i) => i.id === imageId);
    const j = idx + direction;
    if (idx < 0 || j < 0 || j >= images.length) return;
    const a = images[idx];
    const b = images[j];
    setBusyId(imageId);
    setError(null);
    try {
      const soA = a.sort_order;
      const soB = b.sort_order;
      const r1 = await fetch(basePath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: a.id, sort_order: soB }),
      });
      const j1 = await r1.json();
      if (!r1.ok || !(j1 as { success?: boolean }).success) {
        throw new Error((j1 as { error?: string }).error || t('reorderError'));
      }
      const r2 = await fetch(basePath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: b.id, sort_order: soA }),
      });
      const j2 = await r2.json();
      if (!r2.ok || !(j2 as { success?: boolean }).success) {
        throw new Error((j2 as { error?: string }).error || t('reorderError'));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reorderError'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('sectionTitle')}
        </h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(ev) => void onUpload(ev)}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="inline-flex items-center gap-1.5">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            ) : (
              <ImageIcon className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {uploading ? t('uploading') : t('upload')}
          </span>
        </Button>
      </div>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{t('sectionHint')}</p>

      {error ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('loading')}</p>
      ) : images.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('empty')}</p>
      ) : (
        <ul className="space-y-3">
          {images.map((img, idx) => (
            <li
              key={img.id}
              className="flex flex-wrap items-start gap-3 rounded-lg border border-neutral-200/90 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900/40"
            >
              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs; avoid remotePatterns config */}
                <img
                  src={img.public_url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium uppercase text-gray-700 dark:text-gray-300">
                    {img.kind === 'hero' ? t('badgeHero') : img.kind}
                  </span>
                  {img.mime_type ? <span>{img.mime_type}</span> : null}
                  {img.byte_size != null ? <span>{Math.round(Number(img.byte_size) / 1024)} KB</span> : null}
                </div>
                {img.caption ? (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-800 dark:text-gray-200">{img.caption}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="px-2"
                  disabled={disabled || busyId !== null || img.kind === 'hero'}
                  title={t('setHero')}
                  onClick={() => void setHero(img.id)}
                >
                  <Star className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="px-2"
                  disabled={disabled || busyId !== null || idx === 0}
                  title={t('moveUp')}
                  onClick={() => void move(img.id, -1)}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="px-2"
                  disabled={disabled || busyId !== null || idx >= images.length - 1}
                  title={t('moveDown')}
                  onClick={() => void move(img.id, 1)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="px-2"
                  disabled={disabled || busyId !== null}
                  title={t('delete')}
                  onClick={() => void remove(img.id)}
                >
                  {busyId === img.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
