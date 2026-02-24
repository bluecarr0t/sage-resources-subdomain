/**
 * API Route: Upload a new report with narrative and/or financial files
 * POST /api/admin/reports/upload
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { geocodeAddress } from '@/lib/geocode';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';

async function extractFromDocx(buffer: Buffer): Promise<{
  raw_content: Record<string, unknown>;
  extracted_data: Record<string, unknown>;
}> {
  const raw_content: Record<string, unknown> = {};
  const extracted_data: Record<string, unknown> = {};

  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
  const $ = cheerio.load(html);

  const paragraphs: string[] = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text) paragraphs.push(text);
  });
  const fullText = paragraphs.join('\n');

  const tables_data: Array<{ table_id: string; rows: string[][] }> = [];
  $('table').each((i, table) => {
    const rows: string[][] = [];
    $(table)
      .find('tr')
      .each((_, tr) => {
        const rowData: string[] = [];
        $(tr)
          .find('td, th')
          .each((_, cell) => {
            rowData.push($(cell).text().trim());
          });
        if (rowData.length) rows.push(rowData);
      });
    tables_data.push({ table_id: `table_${i + 1}`, rows });
  });

  raw_content.full_text = fullText;
  raw_content.paragraphs = paragraphs;
  raw_content.extracted_at = new Date().toISOString();

  extracted_data.sections = { full_text: fullText };
  extracted_data.tables = tables_data;
  extracted_data.metadata = {
    total_paragraphs: paragraphs.length,
    total_tables: tables_data.length,
    processed_at: new Date().toISOString(),
  };

  return { raw_content, extracted_data };
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!isAllowedEmailDomain(session.user.email)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

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
      const { raw_content: rc, extracted_data: ed } = await extractFromDocx(buf);
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
      const { raw_content: rc, extracted_data: ed } = await extractFromDocx(buf);
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
      user_id: session.user.id,
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
}
