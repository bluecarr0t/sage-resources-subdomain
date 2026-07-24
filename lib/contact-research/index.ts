export {
  CONTACT_CATEGORIES,
  WEB_RESEARCH_SOURCE,
  isContactCategory,
  type ContactCategory,
  type ContactConfidence,
  type ContactExtraction,
  type ContactInsertRow,
  type ContactSeedCandidate,
  type GateResult,
  type SeedMode,
} from '@/lib/contact-research/types';

export {
  isJunkEmail,
  isValidEmailShape,
  isGenericInbox,
  normalizeEmail,
} from '@/lib/contact-research/junk-email';

export {
  gateExtraction,
  pickPreferredExtraction,
  toContactInsertRow,
  externalIdForEmail,
  normalizeCompanyKey,
  domainFromUrl,
  assertWebResearchCategory,
} from '@/lib/contact-research/validate';

export { buildContactSeedQueue, searchContactPagesForCompany, loadResearchedSkipSets } from '@/lib/contact-research/seed';

export { extractContactsFromMarkdown } from '@/lib/contact-research/extract';

export {
  loadExistingContactEmails,
  insertWebResearchContact,
  type InsertContactResult,
} from '@/lib/contact-research/insert';

export {
  candidatePageUrls,
  resolveAndScrapePages,
  scrapeContactPage,
  type ScrapedPage,
} from '@/lib/contact-research/resolve-pages';

export {
  runContactResearch,
  type ContactResearchRunOptions,
  type ContactResearchRunResult,
} from '@/lib/contact-research/run';
