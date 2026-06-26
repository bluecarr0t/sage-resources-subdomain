import { getReviewStatusDisplayLabel } from '@/lib/project-pipeline/review-status';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import { formatProjectPipelineSheetDate } from '@/lib/project-pipeline/due-date-emphasis';

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDueDateLabel(value: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '—';
  return formatProjectPipelineSheetDate(trimmed) || trimmed;
}

function buildEmailShell(input: {
  title: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  const title = escapeHtml(input.title);
  const headline = escapeHtml(input.headline);
  const ctaLabel = escapeHtml(input.ctaLabel);
  const ctaUrl = escapeHtml(input.ctaUrl);

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
                Sage Outdoor Advisory · Job Pipeline notification
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function jobDetailRows(job: ProjectPipelineJob, actorDisplayName: string): string {
  const rows = [
    ['Job #', job.jobNumber],
    ['Client', job.client],
    ['Property', job.propertyLocation],
    ['Consultant', job.appraiserConsultant],
    ['Updated by', actorDisplayName],
  ];

  return rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.muted};vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
          <td style="padding:6px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.text};vertical-align:top">${escapeHtml(value?.trim() || '—')}</td>
        </tr>`
    )
    .join('');
}

function buildJobContextTable(job: ProjectPipelineJob, actorDisplayName: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px">${jobDetailRows(job, actorDisplayName)}</table>`;
}

export function buildJobPipelineAdminUrl(siteUrl?: string): string {
  const base = (siteUrl ?? process.env.SITE_URL ?? 'https://resources.sageoutdooradvisory.com').replace(
    /\/$/,
    ''
  );
  return `${base}/admin/job-pipeline`;
}

/** @deprecated Use buildJobPipelineAdminUrl */
export function buildActiveJobsUrl(siteUrl?: string): string {
  return buildJobPipelineAdminUrl(siteUrl);
}

function buildSubmitReviewEmail(input: {
  job: ProjectPipelineJob;
  actorDisplayName: string;
  note?: string;
  resubmit?: boolean;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  const client = input.job.client?.trim() || 'Unknown client';
  const resubmit = Boolean(input.resubmit);
  const headline = resubmit ? 'Resubmitted for review' : 'Submitted for review';
  const subject = `${resubmit ? 'Resubmission' : 'Review request'}: Job #${input.job.jobNumber} — ${client}`;
  const noteBlock = input.note?.trim()
    ? `<p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text}"><strong>Note from ${escapeHtml(input.actorDisplayName)}:</strong><br />${escapeHtml(input.note.trim())}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text}">
      ${escapeHtml(input.actorDisplayName)} ${resubmit ? 'resubmitted this project for your review.' : 'submitted this project for your review.'}
    </p>
    ${noteBlock}
    ${buildJobContextTable(input.job, input.actorDisplayName)}
  `;

  return {
    subject,
    html: buildEmailShell({
      title: subject,
      headline,
      bodyHtml,
      ctaLabel: 'Open Job Pipeline',
      ctaUrl: buildJobPipelineAdminUrl(input.activeJobsUrl),
    }),
  };
}

export function buildSubmitForReviewEmail(input: {
  job: ProjectPipelineJob;
  actorDisplayName: string;
  note?: string;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  return buildSubmitReviewEmail({ ...input, resubmit: false });
}

function formatSubmittedAtLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildSubmissionReceiptTable(input: {
  job: ProjectPipelineJob;
  submittedAt: string;
  note: string;
}): string {
  const rows = [
    ['Job #', input.job.jobNumber],
    ['Client', input.job.client],
    ['Property', input.job.propertyLocation],
    ['Project Manager', input.job.projMgr],
    ['Submitted', formatSubmittedAtLabel(input.submittedAt)],
    ['Your note', input.note],
  ];

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px">${rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.muted};vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
          <td style="padding:6px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.text};vertical-align:top;white-space:pre-wrap">${escapeHtml(value?.trim() || '—')}</td>
        </tr>`
    )
    .join('')}</table>`;
}

function buildSubmissionReceiptEmail(input: {
  job: ProjectPipelineJob;
  submittedAt: string;
  note: string;
  resubmit?: boolean;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  const client = input.job.client?.trim() || 'Unknown client';
  const resubmit = Boolean(input.resubmit);
  const headline = resubmit ? 'Resubmission receipt' : 'Submission receipt';
  const subject = `Receipt: ${resubmit ? 'Resubmitted' : 'Submitted'} for review — Job #${input.job.jobNumber} — ${client}`;
  const trimmedNote = input.note.trim();

  const bodyHtml = `
    <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text}">
      This confirms your ${resubmit ? 'resubmission' : 'submission'} for review was recorded on <strong>${escapeHtml(formatSubmittedAtLabel(input.submittedAt))}</strong>.
      ${trimmedNote ? ' A copy of your note and project details are below for your records.' : ' Project details are below for your records.'}
    </p>
    ${buildSubmissionReceiptTable({
      job: input.job,
      submittedAt: input.submittedAt,
      note: trimmedNote || '—',
    })}
  `;

  return {
    subject,
    html: buildEmailShell({
      title: subject,
      headline,
      bodyHtml,
      ctaLabel: 'Open Job Pipeline',
      ctaUrl: buildJobPipelineAdminUrl(input.activeJobsUrl),
    }),
  };
}

export function buildSubmitForReviewReceiptEmail(input: {
  job: ProjectPipelineJob;
  submittedAt: string;
  note: string;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  return buildSubmissionReceiptEmail({ ...input, resubmit: false });
}

export function buildResubmitForReviewReceiptEmail(input: {
  job: ProjectPipelineJob;
  submittedAt: string;
  note: string;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  return buildSubmissionReceiptEmail({ ...input, resubmit: true });
}

export function buildResubmitForReviewEmail(input: {
  job: ProjectPipelineJob;
  actorDisplayName: string;
  note?: string;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  return buildSubmitReviewEmail({ ...input, resubmit: true });
}

export function buildReviewStatusChangeEmail(input: {
  job: ProjectPipelineJob;
  previousStatus: string;
  newStatus: string;
  actorDisplayName: string;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  const client = input.job.client?.trim() || 'Unknown client';
  const subject = `Review update: Job #${input.job.jobNumber} — ${client}`;
  const previous = getReviewStatusDisplayLabel(input.previousStatus);
  const next = getReviewStatusDisplayLabel(input.newStatus);

  const bodyHtml = `
    <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text}">
      Review status changed from <strong>${escapeHtml(previous)}</strong> to <strong>${escapeHtml(next)}</strong>.
    </p>
    ${buildJobContextTable(input.job, input.actorDisplayName)}
  `;

  return {
    subject,
    html: buildEmailShell({
      title: subject,
      headline: 'Review status updated',
      bodyHtml,
      ctaLabel: 'Open Job Pipeline',
      ctaUrl: buildJobPipelineAdminUrl(input.activeJobsUrl),
    }),
  };
}

export function buildDueDateChangeEmail(input: {
  job: ProjectPipelineJob;
  previousDueDate: string;
  newDueDate: string;
  actorDisplayName: string;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  const client = input.job.client?.trim() || 'Unknown client';
  const subject = `Due date updated: Job #${input.job.jobNumber} — ${client}`;
  const previous = formatDueDateLabel(input.previousDueDate);
  const next = formatDueDateLabel(input.newDueDate);

  const bodyHtml = `
    <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text}">
      Due date changed from <strong>${escapeHtml(previous)}</strong> to <strong>${escapeHtml(next)}</strong>.
    </p>
    ${buildJobContextTable(input.job, input.actorDisplayName)}
  `;

  return {
    subject,
    html: buildEmailShell({
      title: subject,
      headline: 'Due date updated',
      bodyHtml,
      ctaLabel: 'Open Job Pipeline',
      ctaUrl: buildJobPipelineAdminUrl(input.activeJobsUrl),
    }),
  };
}

export function buildProjectStatusChangeEmail(input: {
  job: ProjectPipelineJob;
  previousStatus: string;
  newStatus: string;
  actorDisplayName: string;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  const client = input.job.client?.trim() || 'Unknown client';
  const subject = `Project status updated: Job #${input.job.jobNumber} — ${client}`;
  const previous = input.previousStatus?.trim() || '—';
  const next = input.newStatus?.trim() || '—';

  const bodyHtml = `
    <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text}">
      Project status changed from <strong>${escapeHtml(previous)}</strong> to <strong>${escapeHtml(next)}</strong>.
    </p>
    ${buildJobContextTable(input.job, input.actorDisplayName)}
  `;

  return {
    subject,
    html: buildEmailShell({
      title: subject,
      headline: 'Project status updated',
      bodyHtml,
      ctaLabel: 'Open Job Pipeline',
      ctaUrl: buildJobPipelineAdminUrl(input.activeJobsUrl),
    }),
  };
}

function buildDueDateReminderJobTable(job: ProjectPipelineJob): string {
  const rows = [
    ['Job #', job.jobNumber],
    ['Client', job.client],
    ['Property', job.propertyLocation],
    ['Consultant', job.appraiserConsultant],
    ['Project Manager', job.projMgr],
    ['Due date', formatDueDateLabel(job.dueDate)],
    ['Project status', job.projectStatus?.trim() || '—'],
    ['Review status', getReviewStatusDisplayLabel(job.reviewStatus)],
  ];

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px">${rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.muted};vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
          <td style="padding:6px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${BRAND.text};vertical-align:top">${escapeHtml(value?.trim() || '—')}</td>
        </tr>`
    )
    .join('')}</table>`;
}

function buildDueDateReminderEmail(input: {
  job: ProjectPipelineJob;
  headline: string;
  lead: string;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  const client = input.job.client?.trim() || 'Unknown client';
  const dueLabel = formatDueDateLabel(input.job.dueDate);
  const subject = `${input.headline}: Job #${input.job.jobNumber} — ${client}`;
  const bodyHtml = `
    <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text}">
      ${escapeHtml(input.lead)}
    </p>
    <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text}">
      <strong>Due date:</strong> ${escapeHtml(dueLabel)}
    </p>
    ${buildDueDateReminderJobTable(input.job)}
  `;

  return {
    subject,
    html: buildEmailShell({
      title: subject,
      headline: input.headline,
      bodyHtml,
      ctaLabel: 'Open Job Pipeline',
      ctaUrl: buildJobPipelineAdminUrl(input.activeJobsUrl),
    }),
  };
}

export function buildDueDateUpcomingReminderEmail(input: {
  job: ProjectPipelineJob;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  return buildDueDateReminderEmail({
    job: input.job,
    headline: 'Due soon',
    lead: 'This project is due on the next business day. Please confirm you are on track to deliver.',
    activeJobsUrl: input.activeJobsUrl,
  });
}

export function buildDueDateDueTodayReminderEmail(input: {
  job: ProjectPipelineJob;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  return buildDueDateReminderEmail({
    job: input.job,
    headline: 'Due today',
    lead: 'This project is due today. Please complete delivery or update the project status in Job Pipeline.',
    activeJobsUrl: input.activeJobsUrl,
  });
}

export function buildDueDateOverdueReminderEmail(input: {
  job: ProjectPipelineJob;
  activeJobsUrl?: string;
}): { subject: string; html: string } {
  return buildDueDateReminderEmail({
    job: input.job,
    headline: 'Past due — action needed',
    lead: 'This project is past its due date and is not marked complete. Please finish the deliverable or update the due date and status.',
    activeJobsUrl: input.activeJobsUrl,
  });
}
