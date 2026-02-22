import { prisma } from '@/lib/db/prisma';
import { computeAssessmentScore } from '@/lib/scoring/engine';

export async function generateAssessmentReport(args: {
  tenantId: string;
  assessmentId: string;
  userId: string;
}) {
  const assessment = await prisma.assessment.findFirst({
    where: { id: args.assessmentId, tenantId: args.tenantId },
    include: {
      template: true,
      responses: {
        include: {
          question: {
            include: {
              control: true
            }
          },
          evidenceLinks: {
            include: {
              evidence: {
                select: { id: true, name: true }
              }
            }
          }
        }
      }
    }
  });

  if (!assessment) {
    throw new Error('Assessment not found');
  }

  const score = computeAssessmentScore(
    assessment.responses.map((response) => ({
      domain: response.question.control.domain,
      controlCode: response.question.control.code,
      score: response.score ?? 0,
      weight: response.question.weight,
      confidence: response.confidence ?? 0.5
    }))
  );

  const evidenceCount = assessment.responses.reduce((total, response) => total + response.evidenceLinks.length, 0);
  const topGaps = score.gaps.slice(0, 5);

  const summary = `Overall readiness ${score.overall}/4 with ${Math.round(
    score.confidence * 100
  )}% confidence across ${assessment.responses.length} answered controls.`;

  const markdown = [
    `# ${assessment.name} Readiness Report`,
    '',
    `Customer: ${assessment.customerName}`,
    `Template: ${assessment.template.name}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Executive Summary',
    summary,
    '',
    '## Domain Scores',
    ...Object.entries(score.byDomain).map(([domain, value]) => `- ${domain}: ${value}/4`),
    '',
    '## Top Gaps',
    ...(topGaps.length ? topGaps.map((gap) => `- ${gap.controlCode}: ${gap.score}/4`) : ['- No major gaps identified.']),
    '',
    '## Evidence Coverage',
    `- Linked evidence items: ${evidenceCount}`,
    '',
    '## Disclaimer',
    'Not legal advice. This assessment is decision support only.'
  ].join('\n');

  const report = await prisma.report.create({
    data: {
      tenantId: args.tenantId,
      assessmentId: assessment.id,
      title: `${assessment.name} Readiness Report`,
      summary,
      markdown,
      jsonPayload: {
        assessmentId: assessment.id,
        assessmentName: assessment.name,
        customerName: assessment.customerName,
        templateName: assessment.template.name,
        generatedAt: new Date().toISOString(),
        score,
        topGaps,
        evidenceCount
      },
      generatedBy: args.userId
    }
  });

  return { report, score };
}
