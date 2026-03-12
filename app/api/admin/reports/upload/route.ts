/**
 * API Route: Upload a new report with narrative and/or financial files
 * POST /api/admin/reports/upload
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { geocodeAddress } from '@/lib/geocode';
import { extractRawContentFromDocx } from '@/lib/parsers/feasibility-docx-parser';
import { randomUUID } from 'crypto';

async function extractFromDocx(buffer: Buffer, filename?: string): Promise<{
  raw_content: Record<string, unknown>;
  extracted_data: Record<string, unknown>;
}> {
  const raw = await extractRawContentFromDocx(buffer, filename);

  const raw_content: Record<string, unknown> = {
    full_text: raw.fullText,
    paragraphs: raw.paragraphs,
    extracted_at: new Date().toISOString(),
  };
  if (raw.messages.length) raw_content.messages = raw.messages;

  const imageMessages = raw.messages.filter((m) =>
    /image|picture|photo|figure/i.test(m)
  );
  const extracted_data: Record<string, unknown> = {
    sections: { full_text: raw.fullText },
    tables: raw.tables,
    metadata: {
      total_paragraphs: raw.paragraphs.length,
      total_tables: raw.tables.length,
      processed_at: new Date().toISOString(),
    },
  };
  if (raw.messages.length) extracted_data.messages = raw.messages;
  if (imageMessages.length) {
    extracted_data.image_placeholders = imageMessages.map((msg, i) => ({
      index: i + 1,
      message: msg,
      note: 'Image was present in document but not extracted',
    }));
  }

  return { raw_content, extracted_data };
}

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const property_name = formData.get('property_name') as string;

    if (!title?.trim() || !property_name?.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Title and property name are required',
      }, { status: 400 });
    }

    const narrative_file = formData.get('narrative_file') as File | null;
    const financial_file = formData.get('financial_file') as File | null;

    if (!narrative_file?.size && !financial_file?.size) {
      return NextResponse.json({
        success: false,
        message: 'At least one file (narrative or financial) is required',
      }, { status: 400 });
    }

    const report_id = randomUUID();
    const raw_content: Record<string, unknown> = {};
    const extracted_data: Record<string, unknown> = {};
    const BUCKET_NAME = 'report-uploads';

    const supabaseAdmin = createServerClient();

    // Upload files to Supabase Storage and extract content
    if (narrative_file?.size && narrative_file.name?.toLowerCase().endsWith('.docx')) {
      const buf = Buffer.from(await narrative_file.arrayBuffer());
      const { raw_content: rc, extracted_data: ed } = await extractFromDocx(buf, narrative_file.name);
      raw_content.narrative = { ...rc, file_type: 'narrative', filename: narrative_file.name };
      extracted_data.narrative = { ...ed, file_type: 'narrative', filename: narrative_file.name };

      const storagePath = `${report_id}/narrative.docx`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buf, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false,
        });

      if (uploadError) {
        console.error('[api/admin/reports/upload] Storage upload error (narrative):', uploadError);
        const isBucketErr = uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found');
        const errMsg = isBucketErr ? 'Storage bucket report-uploads does not exist. Create it in Supabase Dashboard.' : ('Failed to upload narrative file - ' + String(uploadError.message));
        return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
      }
    }

    if (financial_file?.size && financial_file.name?.toLowerCase().endsWith('.docx')) {
      const buf = Buffer.from(await financial_file.arrayBuffer());
      const { raw_content: rc, extracted_data: ed } = await extractFromDocx(buf, financial_file.name);
      raw_content.financial = { ...rc, file_type: 'financial', filename: financial_file.name };
      extracted_data.financial = { ...ed, file_type: 'financial', filename: financial_file.name };

      const storagePath = `${report_id}/financial.docx`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buf, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false,
        });

      if (uploadError) {
        console.error('[api/admin/reports/upload] Storage upload error (financial):', uploadError);
        const isBucketErr = uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found');
        const errMsg = isBucketErr ? 'Storage bucket report-uploads does not exist. Create it in Supabase Dashboard.' : ('Failed to upload financial file - ' + String(uploadError.message));
        return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
      }
    }

    const location = [
      formData.get('city'),
      formData.get('state'),
    ]
      .filter(Boolean)
      .join(', ') || (formData.get('address_1') as string) || '';

    const address_1 = (formData.get('address_1') as string) || '';
    const city = (formData.get('city') as string) || '';
    const state = (formData.get('state') as string) || '';
    const zip_code = (formData.get('zip_code') as string) || '';
    const country = (formData.get('country') as string) || 'USA';

    let latitude: number | null = null;
    let longitude: number | null = null;
    const coords = await geocodeAddress(address_1, city, state, zip_code, country);
    if (coords) {
      latitude = coords.lat;
      longitude = coords.lng;
    }

    const total_sites = formData.get('total_sites');
    const unit_mix_str = formData.get('unit_mix') as string;
    let unit_mix = null;
    if (unit_mix_str) {
      try {
        unit_mix = JSON.parse(unit_mix_str);
      } catch {
        // ignore
      }
    }

    const report_data = {
      id: report_id,
      user_id: auth.session.user.id,
      title: title.trim(),
      property_name: property_name.trim(),
      location: location || null,
      address_1: address_1 || null,
      address_2: (formData.get('address_2') as string) || null,
      city: city || null,
      state: state || null,
      zip_code: zip_code || null,
      country,
      latitude,
      longitude,
      market_type: (formData.get('market_type') as string) || 'outdoor_hospitality',
      total_sites: total_sites ? parseInt(String(total_sites), 10) : null,
      unit_mix,
      dropbox_url: (formData.get('dropbox_url') as string) || null,
      has_narrative: !!narrative_file?.size,
      has_financial: !!financial_file?.size,
      narrative_file_path: narrative_file?.size ? `${report_id}/narrative.docx` : null,
      financial_file_path: financial_file?.size ? `${report_id}/financial.docx` : null,
      client_id: (formData.get('client_id') as string) || null,
      status: 'draft',
      raw_content: Object.keys(raw_content).length ? raw_content : null,
      extracted_data: Object.keys(extracted_data).length ? extracted_data : null,
    };

    const { data, error } = await supabaseAdmin
      .from('reports')
      .insert(report_data)
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: false,
          message: 'Reports table does not exist. Run scripts/create-reports-table.sql in Supabase.',
        }, { status: 503 });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      report: data,
      message: 'Report uploaded successfully',
    });
  } catch (err) {
    console.error('[api/admin/reports/upload] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to upload report' },
      { status: 500 }
    );
  }
}, { requireRole: 'admin' });
