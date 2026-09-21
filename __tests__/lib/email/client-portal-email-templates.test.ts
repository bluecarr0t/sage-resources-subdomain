import {
  buildClientPortalInviteEmail,
  buildClientPortalRequestOpenedEmail,
  buildClientPortalStatusEmail,
  escapeClientPortalEmailHtml,
} from '@/lib/email/client-portal-email-templates';

const job = {
  jobNumber: '26-100A-01',
  client: 'Acme',
  propertyLocation: 'Hopewell, NY',
  service: 'Feasibility Study',
};

describe('client portal email templates', () => {
  it('escapes HTML in notes', () => {
    expect(escapeClientPortalEmailHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('includes a portal CTA and escaped author note on status mail', () => {
    const email = buildClientPortalStatusEmail({
      job,
      stageLabel: 'In progress',
      note: 'Need <site> plan',
    });
    expect(email.subject).toContain('26-100A-01');
    expect(email.html).toContain('/client-portal/26-100A-01');
    expect(email.html).toContain('Need &lt;site&gt; plan');
    expect(email.html).not.toContain('Need <site> plan');
  });

  it('marks requested items as action needed', () => {
    const email = buildClientPortalRequestOpenedEmail({
      job,
      title: 'Utility letters',
      body: 'Please send water and sewer letters.',
    });
    expect(email.subject).toContain('Action needed');
    expect(email.html).toContain('Complete requested item');
    expect(email.ctaUrl).toContain('/client-portal/26-100A-01');
  });

  it('invites the client to the workspace', () => {
    const email = buildClientPortalInviteEmail({ job });
    expect(email.subject).toContain('client portal is ready');
    expect(email.html).toContain('Open client portal');
  });
});
