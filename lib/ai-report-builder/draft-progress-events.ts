/**
 * NDJSON progress events for Report Builder generate-draft stream mode.
 */

export type DraftProgressPhase =
  | 'enrich'
  | 'stdb'
  | 'assumptions'
  | 'model'
  | 'section:executive_summary'
  | 'section:letter_of_transmittal'
  | 'section:swot'
  | 'section:site_analysis'
  | 'section:demand_indicators'
  | 'section:area_analysis'
  | 'section:supply_competition'
  | 'section:industry_overview'
  | 'assemble_docx'
  | 'assemble_xlsx'
  | 'qa'
  | 'upload';

export type DraftProgressEvent =
  | { type: 'meta'; studyId: string; correlationId: string }
  | { type: 'phase'; step: DraftProgressPhase; status: 'started' | 'complete' | 'skipped'; detail?: string }
  | {
      type: 'result';
      success: true;
      studyId: string;
      reportId: string;
      docxUrl?: string;
      xlsxUrl?: string;
      authorChecklistUrl?: string;
      qa?: { passed: boolean; flags: string[] };
      analystTasks?: string[];
      /** Proposed / used assumptions for review UI */
      assumptions?: import('@/lib/feasibility-model').FeasibilityAssumptions;
      docxDiagnostics?: {
        identityReplacements: number;
        imagesPlaceholdered: number;
        imagesKept: number;
        sampleFingerprintsRemaining: string[];
        sectionHits: Record<string, string>;
        tourismPlaceholdersInjected?: number;
        tourismDrawingsStripped?: number;
      };
    }
  | { type: 'error'; success: false; message: string; status?: number };

export type DraftProgressEmit = (ev: DraftProgressEvent) => void;
