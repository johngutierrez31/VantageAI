import { PlanTier } from '@prisma/client';

export type PlanLimits = {
  maxTemplates: number;
  maxAssessmentsPerMonth: number;
  maxEvidenceItems: number;
  evidenceFilesMax: number;
  questionnaireRunsPerMonth: number;
  copilotTokensPerDay: number;
  exportFormats: string[];
  canExportPdf: boolean;
  canUseAI: boolean;
  canImportQuestionnaire: boolean;
  canGenerateBrandedReport: boolean;
  multiClient: boolean;
  templatesLibraryExpanded: boolean;
  auditExport: boolean;
  customFrameworks: boolean;
};

const limitsByPlan: Record<PlanTier, PlanLimits> = {
  FREE: {
    maxTemplates: 3,
    maxAssessmentsPerMonth: 8,
    maxEvidenceItems: 25,
    evidenceFilesMax: 25,
    questionnaireRunsPerMonth: 3,
    copilotTokensPerDay: 5000,
    exportFormats: ['basic_html_or_pdf'],
    canExportPdf: true,
    canUseAI: true,
    canImportQuestionnaire: true,
    canGenerateBrandedReport: true,
    multiClient: false,
    templatesLibraryExpanded: false,
    auditExport: false,
    customFrameworks: false
  },
  STARTER: {
    maxTemplates: 5,
    maxAssessmentsPerMonth: 20,
    maxEvidenceItems: 500,
    evidenceFilesMax: 500,
    questionnaireRunsPerMonth: 25,
    copilotTokensPerDay: 50000,
    exportFormats: ['pdf_or_html', 'csv'],
    canExportPdf: true,
    canUseAI: true,
    canImportQuestionnaire: true,
    canGenerateBrandedReport: true,
    multiClient: false,
    templatesLibraryExpanded: false,
    auditExport: false,
    customFrameworks: false
  },
  PRO: {
    maxTemplates: 25,
    maxAssessmentsPerMonth: 100,
    maxEvidenceItems: 2000,
    evidenceFilesMax: 2000,
    questionnaireRunsPerMonth: 200,
    copilotTokensPerDay: 150000,
    exportFormats: ['pdf_or_html', 'csv', 'bundle_if_possible'],
    canExportPdf: true,
    canUseAI: true,
    canImportQuestionnaire: true,
    canGenerateBrandedReport: true,
    multiClient: false,
    templatesLibraryExpanded: false,
    auditExport: false,
    customFrameworks: false
  },
  BUSINESS: {
    maxTemplates: 999,
    maxAssessmentsPerMonth: 9999,
    maxEvidenceItems: 10000,
    evidenceFilesMax: 10000,
    questionnaireRunsPerMonth: 2000,
    copilotTokensPerDay: 300000,
    exportFormats: ['pdf_or_html', 'csv', 'bundle_if_possible', 'branded', 'board_pack_placeholder'],
    canExportPdf: true,
    canUseAI: true,
    canImportQuestionnaire: true,
    canGenerateBrandedReport: true,
    multiClient: true,
    templatesLibraryExpanded: true,
    auditExport: false,
    customFrameworks: false
  },
  ENTERPRISE: {
    maxTemplates: 10000,
    maxAssessmentsPerMonth: 100000,
    maxEvidenceItems: 50000,
    evidenceFilesMax: 50000,
    questionnaireRunsPerMonth: 10000,
    copilotTokensPerDay: 1000000,
    exportFormats: ['pdf_or_html', 'csv', 'bundle_if_possible', 'branded', 'board_pack_placeholder'],
    canExportPdf: true,
    canUseAI: true,
    canImportQuestionnaire: true,
    canGenerateBrandedReport: true,
    multiClient: true,
    templatesLibraryExpanded: true,
    auditExport: true,
    customFrameworks: true
  }
};

export function getLimitsForPlan(plan: PlanTier | null | undefined): PlanLimits {
  return limitsByPlan[plan ?? 'FREE'];
}

export function isBillingActive(status: string | null | undefined) {
  if (!status) return false;
  return ['active', 'trialing', 'past_due'].includes(status);
}

