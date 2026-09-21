import { getTrustedAppOrigin } from '@/lib/trusted-app-origin';
import { clientPortalJobPath } from '@/lib/client-portal/sanitize';
import { CLIENT_PORTAL_PATH } from '@/lib/client-portal/constants';

const BRAND = {
  pageBg: '#f3f2ec',
  cardBg: '#faf9f3',
  border: '#c7d2c7',
  divider: '#e3e7e3',
  text: '#1a1a1a',
  muted: '#5c5c5c',
  link: '#2d5a3d',
  logoUrl: 'https://resources.sageoutdooradvisory.com/logos/sage-logo-dark.png',
  siteUrl: 'https://sageoutdooradvisory.com/',
} as const;

export function escapeClientPortalEmailHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getClientPortalPublicUrl(jobNumber?: string): string {
  const origin = getTrustedAppOrigin();
  if (!jobNumber?.trim()) return `${origin}${CLIENT_PORTAL_PATH}`;
  return `${origin}${clientPortalJobPath(jobNumber)}`;
}

function buildEmailShell(input: {
  title: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  const title = escapeClientPortalEmailHtml(input.title);
  const headline = escapeClientPortalEmailHtml(input.headline);
  const ctaLabel = escapeClientPortalEmailHtml(input.ctaLabel);
  const ctaUrl = escapeClientPortalEmailHtml(input.ctaUrl);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;width:100%!important;background-color:${BRAND.pageBg};-webkit-text-size-adjust:100%;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.pageBg}">
      <tr>
        <td align="center" style="padding:32px 16px">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background-color:${BRAND.cardBg};border:1px solid ${BRAND.border}">
            <tr>
              <td align="center" style="padding:28px 32px 20px;border-bottom:1px solid ${BRAND.divider};background-color:${BRAND.cardBg}">
                <a href="${BRAND.siteUrl}" style="text-decoration:none" target="_blank">
                  <img src="${BRAND.logoUrl}" alt="Sage Outdoor Advisory" width="160" style="display:block;border:0;max-width:160px;height:auto" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px">
                <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:${BRAND.text}">${headline}</p>
                ${input.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border-radius:4px;background-color:${BRAND.link}">
                      <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${ctaLabel}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:${BRAND.muted}">
                Sage Outdoor Advisory · Client portal
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text}">${escapeClientPortalEmailHtml(text)}</p>`;
}

function muted(text: string): string {
  return `<p style="margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.muted}">${escapeClientPortalEmailHtml(text)}</p>`;
}

export type ClientPortalEmailJobContext = {
  jobNumber: string;
  client: string;
  propertyLocation: string;
  service: string;
};

function jobContextHtml(job: ClientPortalEmailJobContext): string {
  return [
    muted(`Job ${job.jobNumber} · ${job.service}`),
    muted(`${job.client}${job.propertyLocation ? ` · ${job.propertyLocation}` : ''}`),
  ].join('');
}

export function buildClientPortalInviteEmail(input: {
  job: ClientPortalEmailJobContext;
  note?: string;
}): { subject: string; html: string; ctaUrl: string } {
  const ctaUrl = getClientPortalPublicUrl(input.job.jobNumber);
  const noteHtml = input.note?.trim()
    ? paragraph(`Note from your author: ${input.note.trim()}`)
    : '';
  return {
    subject: `Your Sage client portal is ready — ${input.job.jobNumber}`,
    ctaUrl,
    html: buildEmailShell({
      title: 'Client portal invite',
      headline: 'Your engagement workspace is ready',
      ctaLabel: 'Open client portal',
      ctaUrl,
      bodyHtml: [
        jobContextHtml(input.job),
        paragraph(
          'You can follow the status of your study, read notes from your author, share requested items, and exchange files in one place.'
        ),
        noteHtml,
        paragraph('Use the same email address this message was sent to when you sign in.'),
      ].join(''),
    }),
  };
}

export function buildClientPortalStatusEmail(input: {
  job: ClientPortalEmailJobContext;
  stageLabel: string;
  note?: string;
}): { subject: string; html: string; ctaUrl: string } {
  const ctaUrl = getClientPortalPublicUrl(input.job.jobNumber);
  const noteHtml = input.note?.trim()
    ? paragraph(`Note from your author: ${input.note.trim()}`)
    : '';
  return {
    subject: `Update on ${input.job.jobNumber}: ${input.stageLabel}`,
    ctaUrl,
    html: buildEmailShell({
      title: 'Status update',
      headline: `Your study is now: ${input.stageLabel}`,
      ctaLabel: 'View status',
      ctaUrl,
      bodyHtml: [
        jobContextHtml(input.job),
        paragraph('Open the portal to see the latest progress on your engagement.'),
        noteHtml,
      ].join(''),
    }),
  };
}

export function buildClientPortalAuthorNoteEmail(input: {
  job: ClientPortalEmailJobContext;
  note: string;
}): { subject: string; html: string; ctaUrl: string } {
  const ctaUrl = getClientPortalPublicUrl(input.job.jobNumber);
  return {
    subject: `New note on ${input.job.jobNumber}`,
    ctaUrl,
    html: buildEmailShell({
      title: 'Author note',
      headline: 'A note from your author',
      ctaLabel: 'Read in portal',
      ctaUrl,
      bodyHtml: [jobContextHtml(input.job), paragraph(input.note)].join(''),
    }),
  };
}

export function buildClientPortalRequestOpenedEmail(input: {
  job: ClientPortalEmailJobContext;
  title: string;
  body: string;
}): { subject: string; html: string; ctaUrl: string } {
  const ctaUrl = getClientPortalPublicUrl(input.job.jobNumber);
  return {
    subject: `Action needed on ${input.job.jobNumber}: ${input.title}`,
    ctaUrl,
    html: buildEmailShell({
      title: 'Action needed',
      headline: 'We need a little more from you to keep moving',
      ctaLabel: 'Complete requested item',
      ctaUrl,
      bodyHtml: [
        jobContextHtml(input.job),
        paragraph(input.title),
        input.body.trim() ? paragraph(input.body) : '',
      ].join(''),
    }),
  };
}

export function buildClientPortalRequestSubmittedEmail(input: {
  job: ClientPortalEmailJobContext;
  title: string;
  response: string;
}): { subject: string; html: string; ctaUrl: string } {
  const ctaUrl = getClientPortalPublicUrl(input.job.jobNumber);
  return {
    subject: `Client replied on ${input.job.jobNumber}: ${input.title}`,
    ctaUrl,
    html: buildEmailShell({
      title: 'Client reply',
      headline: 'A requested item was submitted',
      ctaLabel: 'Open portal',
      ctaUrl,
      bodyHtml: [
        jobContextHtml(input.job),
        paragraph(input.title),
        input.response.trim() ? paragraph(input.response) : '',
      ].join(''),
    }),
  };
}

export function buildClientPortalRequestClearedEmail(input: {
  job: ClientPortalEmailJobContext;
  title: string;
}): { subject: string; html: string; ctaUrl: string } {
  const ctaUrl = getClientPortalPublicUrl(input.job.jobNumber);
  return {
    subject: `Request cleared on ${input.job.jobNumber}`,
    ctaUrl,
    html: buildEmailShell({
      title: 'Request cleared',
      headline: 'A requested item is complete',
      ctaLabel: 'View portal',
      ctaUrl,
      bodyHtml: [jobContextHtml(input.job), paragraph(input.title)].join(''),
    }),
  };
}

export function buildClientPortalFileUploadedEmail(input: {
  job: ClientPortalEmailJobContext;
  label: string;
  uploadedByRole: 'staff' | 'client';
}): { subject: string; html: string; ctaUrl: string } {
  const ctaUrl = getClientPortalPublicUrl(input.job.jobNumber);
  const fromClient = input.uploadedByRole === 'client';
  return {
    subject: fromClient
      ? `Client uploaded a file on ${input.job.jobNumber}`
      : `A new file is in your portal for ${input.job.jobNumber}`,
    ctaUrl,
    html: buildEmailShell({
      title: 'File uploaded',
      headline: fromClient ? 'Your client uploaded a file' : 'A file was added to your workspace',
      ctaLabel: 'Open files',
      ctaUrl,
      bodyHtml: [jobContextHtml(input.job), paragraph(input.label)].join(''),
    }),
  };
}
