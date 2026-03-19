import {
  AIDeploymentContext,
  AIDpaStatus,
  AIDataClass,
  AIGovernanceStatus,
  AIPolicyRequirement,
  AIRetentionStatus,
  AIRiskTier,
  AIUseCaseType,
  AIWorkflowType,
  AIYesNoUnknown,
  AfterActionReportStatus,
  ApprovedAnswerScope,
  ApprovedAnswerStatus,
  AssessmentStatus,
  BoardBriefStatus,
  ConnectorActivityStatus,
  ConnectorMode,
  ConnectorProvider,
  ConnectorStatus,
  DraftAnswerStatus,
  EvidenceMapStatus,
  EvidenceMapSupportStrength,
  FindingSourceType,
  FindingStatus,
  IncidentRunbookPackStatus,
  IncidentSeverity,
  IncidentStatus,
  IncidentTimelineEventType,
  IncidentType,
  Prisma,
  PrismaClient,
  PulseSnapshotPeriodType,
  PulseSnapshotStatus,
  PulseSourceModule,
  QuestionnaireMappingStatus,
  QuestionnaireOriginalFormat,
  QuestionnaireUploadStatus,
  QuarterlyReviewStatus,
  ResponseOpsPhase,
  RiskLevel,
  RiskRegisterSourceType,
  RiskRegisterStatus,
  RoadmapHorizon,
  RoadmapItemStatus,
  RoadmapStatus,
  TaskPriority,
  TaskStatus,
  TrustInboxStatus,
  TrustPacketShareMode,
  TrustPacketStatus,
  TrustRoomAccessMode,
  TrustRoomAccessRequestStatus,
  TrustRoomStatus,
  AdoptionImportSource,
  AdoptionImportStatus,
  AdoptionImportTarget
} from '@prisma/client';
import { encryptConnectorSecret } from '../src/lib/integrations/crypto';
import { buildTrustPacketRecord } from '../src/lib/trust/packets';
import { buildTrustPacketManifest } from '../src/lib/trust/package-export';
import { getDefaultTrustRoomSections, hashTrustRoomToken } from '../src/lib/trust/trust-rooms';
import {
  DEMO_IDS,
  DEMO_REPORTING_PERIOD,
  DEMO_USER_ID,
  DEMO_USERS,
  addDays,
  addHours,
  createEvidenceRecord,
  requireValue
} from './demo-support';

export async function seedDemoSuiteStory(prisma: PrismaClient, tenantId: string) {
  const now = new Date();
  const fiveDaysAgo = addDays(now, -5);
  const threeDaysAgo = addDays(now, -3);
  const twoDaysAgo = addDays(now, -2);
  const oneDayAgo = addDays(now, -1);
  const tomorrow = addDays(now, 1);
  const nextWeek = addDays(now, 7);
  const twoWeeksOut = addDays(now, 14);
  const threeWeeksOut = addDays(now, 21);
  const tenWeeksOut = addDays(now, 70);

  const securityTemplate = await prisma.template.findFirst({
    where: { tenantId, name: 'Security Readiness (V1)' },
    select: { id: true, currentVersionId: true }
  });
  const aiTemplate = await prisma.template.findFirst({
    where: { tenantId, name: 'AI Readiness (V1)' },
    select: { id: true, currentVersionId: true }
  });

  const securityVersionId = requireValue(securityTemplate?.currentVersionId, 'Missing seeded security template.');
  const aiVersionId = requireValue(aiTemplate?.currentVersionId, 'Missing seeded AI template.');

  const questions = await prisma.question.findMany({
    where: {
      tenantId,
      control: { templateVersionId: { in: [securityVersionId, aiVersionId] } }
    },
    include: { control: { select: { id: true, code: true } } }
  });

  const questionByPrompt = new Map(questions.map((question) => [question.prompt, question]));
  const policyQuestion = requireValue(questionByPrompt.get('Do you maintain approved security policies?'), 'Missing policy question.');
  const policyOwnerQuestion = requireValue(questionByPrompt.get('Are policy owners assigned and reviewed quarterly?'), 'Missing policy-owner question.');
  const mfaQuestion = requireValue(questionByPrompt.get('Is MFA enforced for privileged accounts?'), 'Missing MFA question.');
  const accessReviewQuestion = requireValue(questionByPrompt.get('Are access reviews performed at least quarterly?'), 'Missing access review question.');
  const aiTieringQuestion = requireValue(questionByPrompt.get('Are AI use-cases classified by impact tier?'), 'Missing AI tiering question.');

  const policyEvidence = await createEvidenceRecord(prisma, {
    id: DEMO_IDS.evidencePolicy,
    tenantId,
    createdBy: DEMO_USER_ID,
    name: 'Security Policy Compendium 2026',
    storageKey: 'demo/security-policy-compendium-2026.md',
    mimeType: 'text/markdown',
    tags: ['trustops', 'policy'],
    extractedText: [
      'Approved security policies are maintained centrally.',
      'Policy owners are assigned and reviewed quarterly.',
      'Buyer-facing responses must use approved language only.'
    ].join('\n'),
    trustCategory: 'Policy Summary',
    createdAt: addDays(now, -45)
  });
  const accessEvidence = await createEvidenceRecord(prisma, {
    id: DEMO_IDS.evidenceAccess,
    tenantId,
    createdBy: DEMO_USER_ID,
    name: 'Privileged Access Review Log',
    storageKey: 'demo/privileged-access-review-log.csv',
    mimeType: 'text/csv',
    tags: ['trustops', 'identity'],
    extractedText: [
      'Privileged MFA is enforced through SSO.',
      'Quarterly access reviews were completed.',
      'Exceptions route to the trust reviewer.'
    ].join('\n'),
    trustCategory: 'Control Evidence',
    createdAt: addDays(now, -20)
  });
  const aiEvidence = await createEvidenceRecord(prisma, {
    id: DEMO_IDS.evidenceAi,
    tenantId,
    createdBy: DEMO_USER_ID,
    name: 'AI Governance Standard',
    storageKey: 'demo/ai-governance-standard.md',
    mimeType: 'text/markdown',
    tags: ['ai-governance', 'trustops'],
    extractedText: [
      'AI use cases are risk-tiered before approval.',
      'Human review is required for customer-facing outputs.',
      'Approved vendors must document retention and logging.'
    ].join('\n'),
    trustCategory: 'AI Governance Summary',
    createdAt: addDays(now, -10)
  });
  await createEvidenceRecord(prisma, {
    id: DEMO_IDS.evidenceIr,
    tenantId,
    createdBy: DEMO_USER_ID,
    name: 'Incident Communications Matrix',
    storageKey: 'demo/incident-communications-matrix.pdf',
    mimeType: 'application/pdf',
    tags: ['response-ops', 'communications'],
    extractedText: [
      'Incident command assigns communications ownership early.',
      'External summaries exclude internal-only notes.',
      'After-action reviews create owned follow-up work.'
    ].join('\n'),
    trustCategory: 'Incident Readiness Summary',
    createdAt: addDays(now, -12)
  });

  await prisma.assessment.create({
    data: {
      id: DEMO_IDS.assessment,
      tenantId,
      templateId: requireValue(securityTemplate?.id, 'Missing security template id.'),
      templateVersionId: securityVersionId,
      name: 'Q1 executive operating readiness review',
      customerName: 'Astera Cloud Security',
      status: AssessmentStatus.IN_PROGRESS,
      createdBy: DEMO_USER_ID,
      createdAt: addDays(now, -7)
    }
  });

  for (const response of [
    [policyQuestion.id, 'Approved policies are maintained and versioned centrally.', 4, 0.94, 'Policy compendium'],
    [policyOwnerQuestion.id, 'Policy owners are assigned; one reminder remains open.', 3, 0.82, 'Cadence active'],
    [mfaQuestion.id, 'MFA is enforced for privileged accounts.', 4, 0.92, 'Access review evidence'],
    [accessReviewQuestion.id, 'Quarterly access reviews are performed.', 3, 0.8, 'One artifact refresh pending']
  ] as const) {
    await prisma.response.create({
      data: {
        tenantId,
        assessmentId: DEMO_IDS.assessment,
        questionId: response[0],
        answer: response[1],
        score: response[2],
        confidence: response[3],
        rationale: response[4],
        updatedBy: DEMO_USER_ID,
        createdAt: addDays(now, -6)
      }
    });
  }

  await prisma.report.create({
    data: {
      id: DEMO_IDS.assessmentReport,
      tenantId,
      assessmentId: DEMO_IDS.assessment,
      title: 'Q1 Operating Readiness Summary',
      summary: 'Controls are solid overall, with trust evidence refresh and AI vendor diligence still active.',
      markdown: '# Q1 Operating Readiness Summary\n\n- Policies strong\n- MFA strong\n- Trust evidence gap still open\n- AI vendor diligence pending\n',
      jsonPayload: { overallScore: 3.5, focusAreas: ['Trust evidence gap', 'AI vendor diligence'] },
      generatedBy: DEMO_USER_ID,
      createdAt: fiveDaysAgo
    }
  });
  await prisma.questionnaireUpload.create({
    data: {
      id: DEMO_IDS.questionnaireUpload,
      tenantId,
      organizationName: 'Northbridge Payments',
      filename: 'northbridge-security-questionnaire.xlsx',
      originalFormat: QuestionnaireOriginalFormat.XLSX,
      status: QuestionnaireUploadStatus.NEEDS_REVIEW,
      parsedJson: {
        buyer: 'Northbridge Payments',
        rows: [
          { rowKey: 'A12', question: 'Do you maintain approved security policies?' },
          { rowKey: 'A18', question: 'Is MFA enforced for privileged accounts?' },
          { rowKey: 'A27', question: 'Are AI use cases classified by impact tier and reviewed?' },
          { rowKey: 'A33', question: 'Can you commit to customer-specific data residency today?' }
        ]
      },
      createdBy: DEMO_USER_ID,
      assignedReviewerUserId: DEMO_USERS[1].id,
      reviewDueAt: oneDayAgo,
      createdAt: fiveDaysAgo
    }
  });

  await prisma.questionnaireItem.createMany({
    data: [
      {
        id: DEMO_IDS.questionnaireItemPolicies,
        tenantId,
        questionnaireUploadId: DEMO_IDS.questionnaireUpload,
        rowKey: 'A12',
        rowOrder: 1,
        questionText: 'Do you maintain approved security policies?',
        normalizedQuestion: 'do you maintain approved security policies',
        contextJson: { worksheet: 'Security', sourceCell: 'A12' },
        createdAt: fiveDaysAgo
      },
      {
        id: DEMO_IDS.questionnaireItemMfa,
        tenantId,
        questionnaireUploadId: DEMO_IDS.questionnaireUpload,
        rowKey: 'A18',
        rowOrder: 2,
        questionText: 'Is MFA enforced for privileged accounts?',
        normalizedQuestion: 'is mfa enforced for privileged accounts',
        contextJson: { worksheet: 'Access', sourceCell: 'A18' },
        createdAt: fiveDaysAgo
      },
      {
        id: DEMO_IDS.questionnaireItemAi,
        tenantId,
        questionnaireUploadId: DEMO_IDS.questionnaireUpload,
        rowKey: 'A27',
        rowOrder: 3,
        questionText: 'Are AI use cases classified by impact tier and reviewed?',
        normalizedQuestion: 'are ai use cases classified by impact tier and reviewed',
        contextJson: { worksheet: 'AI', sourceCell: 'A27' },
        createdAt: fiveDaysAgo
      },
      {
        id: DEMO_IDS.questionnaireItemResidency,
        tenantId,
        questionnaireUploadId: DEMO_IDS.questionnaireUpload,
        rowKey: 'A33',
        rowOrder: 4,
        questionText: 'Can you commit to customer-specific data residency today?',
        normalizedQuestion: 'can you commit to customer specific data residency today',
        contextJson: { worksheet: 'Legal', sourceCell: 'A33' },
        createdAt: fiveDaysAgo
      }
    ]
  });

  await prisma.questionnaireMapping.createMany({
    data: [
      { tenantId, questionnaireItemId: DEMO_IDS.questionnaireItemPolicies, templateQuestionId: policyQuestion.id, confidence: 0.98, status: QuestionnaireMappingStatus.MAPPED, createdAt: fiveDaysAgo },
      { tenantId, questionnaireItemId: DEMO_IDS.questionnaireItemMfa, templateQuestionId: mfaQuestion.id, confidence: 0.97, status: QuestionnaireMappingStatus.MAPPED, createdAt: fiveDaysAgo },
      { tenantId, questionnaireItemId: DEMO_IDS.questionnaireItemAi, templateQuestionId: aiTieringQuestion.id, confidence: 0.93, status: QuestionnaireMappingStatus.MAPPED, createdAt: fiveDaysAgo }
    ]
  });

  await prisma.draftAnswer.createMany({
    data: [
      {
        id: DEMO_IDS.draftPolicies,
        tenantId,
        questionnaireItemId: DEMO_IDS.questionnaireItemPolicies,
        normalizedQuestion: 'do you maintain approved security policies',
        mappedControlIds: [policyQuestion.control.id],
        supportingEvidenceIds: [policyEvidence.id],
        answerText: 'Yes. Approved security policies are maintained centrally with named owners and scheduled review.',
        citationsJson: [{ evidenceName: policyEvidence.name, chunkIndex: 0 }],
        model: 'vantage-questionnaire-responder',
        confidenceScore: 0.97,
        reviewRequired: false,
        status: DraftAnswerStatus.APPROVED,
        createdBy: DEMO_USER_ID,
        reviewedBy: DEMO_USERS[1].id,
        reviewedAt: threeDaysAgo,
        createdAt: fiveDaysAgo
      },
      {
        id: DEMO_IDS.draftMfa,
        tenantId,
        questionnaireItemId: DEMO_IDS.questionnaireItemMfa,
        normalizedQuestion: 'is mfa enforced for privileged accounts',
        mappedControlIds: [mfaQuestion.control.id],
        supportingEvidenceIds: [accessEvidence.id],
        answerText: 'Yes. MFA is enforced for privileged accounts and validated during quarterly access review.',
        citationsJson: [{ evidenceName: accessEvidence.name, chunkIndex: 0 }],
        model: 'vantage-questionnaire-responder',
        confidenceScore: 0.95,
        reviewRequired: false,
        status: DraftAnswerStatus.APPROVED,
        createdBy: DEMO_USER_ID,
        reviewedBy: DEMO_USERS[1].id,
        reviewedAt: threeDaysAgo,
        createdAt: fiveDaysAgo
      },
      {
        id: DEMO_IDS.draftAi,
        tenantId,
        questionnaireItemId: DEMO_IDS.questionnaireItemAi,
        normalizedQuestion: 'are ai use cases classified by impact tier and reviewed',
        mappedControlIds: [aiTieringQuestion.control.id],
        supportingEvidenceIds: [aiEvidence.id],
        answerText: 'Yes. AI use cases are registered, risk-tiered, and reviewed before customer-facing deployment.',
        citationsJson: [{ evidenceName: aiEvidence.name, chunkIndex: 0 }],
        model: 'vantage-questionnaire-responder',
        confidenceScore: 0.9,
        reviewRequired: false,
        status: DraftAnswerStatus.APPROVED,
        createdBy: DEMO_USER_ID,
        reviewedBy: DEMO_USERS[1].id,
        reviewedAt: twoDaysAgo,
        createdAt: fiveDaysAgo
      },
      {
        id: DEMO_IDS.draftResidency,
        tenantId,
        questionnaireItemId: DEMO_IDS.questionnaireItemResidency,
        normalizedQuestion: 'can you commit to customer specific data residency today',
        mappedControlIds: [],
        supportingEvidenceIds: [],
        answerText: 'This commitment requires product and legal review before approval.',
        citationsJson: [],
        model: 'vantage-questionnaire-responder',
        confidenceScore: 0.52,
        reviewRequired: true,
        status: DraftAnswerStatus.NEEDS_REVIEW,
        reviewReason: 'No approved evidence supports this commitment.',
        notesForReviewer: 'Coordinate product, legal, and trust before any external statement.',
        createdBy: DEMO_USER_ID,
        createdAt: fiveDaysAgo
      }
    ]
  });

  await prisma.approvedAnswer.createMany({
    data: [
      { id: DEMO_IDS.approvedPolicies, tenantId, normalizedQuestion: 'do you maintain approved security policies', questionText: 'Do you maintain approved security policies?', answerText: 'Approved security policies are maintained centrally with named owners and scheduled review.', mappedControlIds: [policyQuestion.control.id], supportingEvidenceIds: [policyEvidence.id], status: ApprovedAnswerStatus.ACTIVE, scope: ApprovedAnswerScope.REUSABLE, sourceDraftAnswerId: DEMO_IDS.draftPolicies, sourceQuestionnaireUploadId: DEMO_IDS.questionnaireUpload, sourceQuestionnaireItemId: DEMO_IDS.questionnaireItemPolicies, ownerUserId: DEMO_USERS[1].id, reviewerUserId: DEMO_USERS[1].id, reviewedAt: threeDaysAgo, lastUsedAt: oneDayAgo, usageCount: 14, createdBy: DEMO_USER_ID, createdAt: fiveDaysAgo },
      { id: DEMO_IDS.approvedMfa, tenantId, normalizedQuestion: 'is mfa enforced for privileged accounts', questionText: 'Is MFA enforced for privileged accounts?', answerText: 'MFA is enforced for privileged accounts and validated during quarterly access review.', mappedControlIds: [mfaQuestion.control.id], supportingEvidenceIds: [accessEvidence.id], status: ApprovedAnswerStatus.ACTIVE, scope: ApprovedAnswerScope.REUSABLE, sourceDraftAnswerId: DEMO_IDS.draftMfa, sourceQuestionnaireUploadId: DEMO_IDS.questionnaireUpload, sourceQuestionnaireItemId: DEMO_IDS.questionnaireItemMfa, ownerUserId: DEMO_USERS[1].id, reviewerUserId: DEMO_USERS[1].id, reviewedAt: threeDaysAgo, lastUsedAt: oneDayAgo, usageCount: 11, createdBy: DEMO_USER_ID, createdAt: fiveDaysAgo },
      { id: DEMO_IDS.approvedAi, tenantId, normalizedQuestion: 'are ai use cases classified by impact tier and reviewed', questionText: 'Are AI use cases classified by impact tier and reviewed?', answerText: 'AI use cases are registered, risk-tiered, and reviewed before customer-facing deployment.', mappedControlIds: [aiTieringQuestion.control.id], supportingEvidenceIds: [aiEvidence.id], status: ApprovedAnswerStatus.ACTIVE, scope: ApprovedAnswerScope.TENANT_SPECIFIC, sourceDraftAnswerId: DEMO_IDS.draftAi, sourceQuestionnaireUploadId: DEMO_IDS.questionnaireUpload, sourceQuestionnaireItemId: DEMO_IDS.questionnaireItemAi, ownerUserId: DEMO_USERS[1].id, reviewerUserId: DEMO_USERS[1].id, reviewedAt: twoDaysAgo, lastUsedAt: now, usageCount: 4, createdBy: DEMO_USER_ID, createdAt: fiveDaysAgo }
    ]
  });

  await prisma.trustInboxItem.create({
    data: {
      id: DEMO_IDS.trustInbox,
      tenantId,
      title: 'Northbridge Payments trust request',
      requesterEmail: 'security@northbridge-payments.example',
      status: TrustInboxStatus.IN_REVIEW,
      questionnaireUploadId: DEMO_IDS.questionnaireUpload,
      notes: 'Buyer requested policy summaries, AI governance posture, and data-handling language.',
      createdBy: DEMO_USER_ID,
      createdAt: fiveDaysAgo
    }
  });

  await prisma.trustInboxAttachment.createMany({
    data: [
      { tenantId, inboxItemId: DEMO_IDS.trustInbox, evidenceId: policyEvidence.id, createdBy: DEMO_USER_ID, createdAt: fiveDaysAgo },
      { tenantId, inboxItemId: DEMO_IDS.trustInbox, evidenceId: aiEvidence.id, createdBy: DEMO_USER_ID, createdAt: fiveDaysAgo }
    ]
  });
  await prisma.task.create({
    data: {
      id: DEMO_IDS.trustTask,
      tenantId,
      questionnaireUploadId: DEMO_IDS.questionnaireUpload,
      questionnaireItemId: DEMO_IDS.questionnaireItemResidency,
      trustInboxItemId: DEMO_IDS.trustInbox,
      title: 'Validate buyer-safe data residency language',
      controlCode: 'LEGAL-REVIEW',
      description: 'Confirm product and legal language before approving a residency commitment.',
      assignee: DEMO_USERS[1].name,
      dueDate: oneDayAgo,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      createdBy: DEMO_USER_ID,
      createdAt: threeDaysAgo
    }
  });

  await prisma.evidenceMap.create({
    data: {
      id: DEMO_IDS.evidenceMap,
      tenantId,
      questionnaireUploadId: DEMO_IDS.questionnaireUpload,
      trustInboxItemId: DEMO_IDS.trustInbox,
      name: 'Northbridge Payments evidence map',
      status: EvidenceMapStatus.NEEDS_REVIEW,
      assignedReviewerUserId: DEMO_USERS[1].id,
      reviewDueAt: oneDayAgo,
      createdBy: DEMO_USER_ID,
      createdAt: threeDaysAgo
    }
  });

  await prisma.evidenceMapItem.createMany({
    data: [
      { id: DEMO_IDS.evidenceMapPolicies, tenantId, evidenceMapId: DEMO_IDS.evidenceMap, questionnaireItemId: DEMO_IDS.questionnaireItemPolicies, questionCluster: 'Approved security policy management', normalizedQuestion: 'do you maintain approved security policies', relatedControlIds: [policyQuestion.control.id], evidenceArtifactIds: [policyEvidence.id], ownerIds: [DEMO_USERS[1].id], supportStrength: EvidenceMapSupportStrength.STRONG, buyerSafeSummary: 'Approved policy ownership and review cadence are documented.', recommendedNextAction: 'Refresh the policy summary annually.', createdAt: threeDaysAgo },
      { id: DEMO_IDS.evidenceMapMfa, tenantId, evidenceMapId: DEMO_IDS.evidenceMap, questionnaireItemId: DEMO_IDS.questionnaireItemMfa, questionCluster: 'Privileged MFA enforcement', normalizedQuestion: 'is mfa enforced for privileged accounts', relatedControlIds: [mfaQuestion.control.id], evidenceArtifactIds: [accessEvidence.id], ownerIds: [DEMO_USERS[1].id], supportStrength: EvidenceMapSupportStrength.STRONG, buyerSafeSummary: 'Privileged MFA and access review evidence are available.', recommendedNextAction: 'Carry the latest access review artifact into the next packet refresh.', createdAt: threeDaysAgo },
      { id: DEMO_IDS.evidenceMapAi, tenantId, evidenceMapId: DEMO_IDS.evidenceMap, questionnaireItemId: DEMO_IDS.questionnaireItemAi, questionCluster: 'AI use case governance and review', normalizedQuestion: 'are ai use cases classified by impact tier and reviewed', relatedControlIds: [aiTieringQuestion.control.id], evidenceArtifactIds: [aiEvidence.id], ownerIds: [DEMO_USERS[1].id], supportStrength: EvidenceMapSupportStrength.MODERATE, buyerSafeSummary: 'AI use cases are risk-tiered, but vendor retention review remains open.', recommendedNextAction: 'Close vendor retention review before broader AI assurances.', createdAt: threeDaysAgo },
      { id: DEMO_IDS.evidenceMapResidency, tenantId, evidenceMapId: DEMO_IDS.evidenceMap, questionnaireItemId: DEMO_IDS.questionnaireItemResidency, questionCluster: 'Customer-specific data residency commitments', normalizedQuestion: 'can you commit to customer specific data residency today', relatedControlIds: [], evidenceArtifactIds: [], ownerIds: [DEMO_USERS[1].id], supportStrength: EvidenceMapSupportStrength.MISSING, buyerSafeSummary: 'No approved evidence currently supports this commitment.', recommendedNextAction: 'Route through product and legal review before any buyer-facing approval.', relatedTaskId: DEMO_IDS.trustTask, relatedFindingId: DEMO_IDS.trustFinding, createdAt: threeDaysAgo }
    ]
  });

  await prisma.finding.create({
    data: {
      id: DEMO_IDS.trustFinding,
      tenantId,
      sourceType: FindingSourceType.TRUSTOPS_EVIDENCE_GAP,
      status: FindingStatus.OPEN,
      priority: TaskPriority.HIGH,
      title: 'Buyer residency commitment lacks approved evidence',
      description: 'TrustOps cannot support a customer-specific residency commitment without product and legal sign-off.',
      supportStrength: EvidenceMapSupportStrength.MISSING,
      ownerUserId: DEMO_USERS[1].id,
      questionnaireUploadId: DEMO_IDS.questionnaireUpload,
      questionnaireItemId: DEMO_IDS.questionnaireItemResidency,
      evidenceMapId: DEMO_IDS.evidenceMap,
      evidenceMapItemId: DEMO_IDS.evidenceMapResidency,
      taskId: DEMO_IDS.trustTask,
      createdBy: DEMO_USER_ID,
      createdAt: threeDaysAgo
    }
  });

  const trustDocs = await prisma.trustDoc.findMany({
    where: { tenantId },
    include: { evidence: { select: { id: true, name: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const approvedRows = [
    { rowKey: 'A12', questionText: 'Do you maintain approved security policies?', answerText: 'Yes. Approved security policies are maintained centrally with named owners and scheduled review.', confidenceScore: 0.97, supportingEvidenceIds: [policyEvidence.id], mappedControlIds: [policyQuestion.control.id] },
    { rowKey: 'A18', questionText: 'Is MFA enforced for privileged accounts?', answerText: 'Yes. MFA is enforced for privileged accounts and validated during quarterly access review.', confidenceScore: 0.95, supportingEvidenceIds: [accessEvidence.id], mappedControlIds: [mfaQuestion.control.id] },
    { rowKey: 'A27', questionText: 'Are AI use cases classified by impact tier and reviewed?', answerText: 'Yes. AI use cases are registered, risk-tiered, and reviewed before customer-facing deployment.', confidenceScore: 0.9, supportingEvidenceIds: [aiEvidence.id], mappedControlIds: [aiTieringQuestion.control.id] }
  ];
  const packetBase = buildTrustPacketRecord({ packetName: 'Northbridge Payments trust packet - external share', shareMode: TrustPacketShareMode.EXTERNAL_SHARE, approvedRows, trustDocs, includeAiGovernanceSummary: true, organizationName: 'Northbridge Payments' });
  const packetManifest = buildTrustPacketManifest({
    packetName: packetBase.name,
    shareMode: packetBase.shareMode,
    status: TrustPacketStatus.READY_TO_SHARE,
    reviewerRequired: false,
    organizationName: 'Northbridge Payments',
    approvedContactName: 'Jordan Lee',
    approvedContactEmail: 'trust@astera.example',
    approvedRows,
    evidenceMapStatus: EvidenceMapStatus.NEEDS_REVIEW,
    evidenceMapItems: [
      { questionCluster: 'Approved security policy management', supportStrength: EvidenceMapSupportStrength.STRONG, buyerSafeSummary: 'Approved policy ownership and review cadence are documented.', recommendedNextAction: 'Refresh the policy summary annually.', relatedControlIds: [policyQuestion.control.id], evidenceArtifactIds: [policyEvidence.id] },
      { questionCluster: 'Privileged MFA enforcement', supportStrength: EvidenceMapSupportStrength.STRONG, buyerSafeSummary: 'Privileged MFA and access review evidence are available.', recommendedNextAction: 'Carry the latest access review artifact into the next packet refresh.', relatedControlIds: [mfaQuestion.control.id], evidenceArtifactIds: [accessEvidence.id] },
      { questionCluster: 'AI use case governance and review', supportStrength: EvidenceMapSupportStrength.MODERATE, buyerSafeSummary: 'AI use cases are risk-tiered, but vendor retention review remains open.', recommendedNextAction: 'Close vendor retention review before broader AI assurances.', relatedControlIds: [aiTieringQuestion.control.id], evidenceArtifactIds: [aiEvidence.id] }
    ],
    trustDocs: trustDocs.map((doc) => ({ category: doc.category, evidenceName: doc.evidence.name, createdAt: doc.evidence.createdAt.toISOString() })),
    staleArtifactIds: [],
    includeAiGovernanceSummary: true
  });

  await prisma.trustPacket.create({
    data: {
      id: DEMO_IDS.trustPacket,
      tenantId,
      trustInboxItemId: DEMO_IDS.trustInbox,
      questionnaireUploadId: DEMO_IDS.questionnaireUpload,
      evidenceMapId: DEMO_IDS.evidenceMap,
      name: packetBase.name,
      status: TrustPacketStatus.READY_TO_SHARE,
      shareMode: TrustPacketShareMode.EXTERNAL_SHARE,
      packetSections: packetBase.packetSections,
      packageManifestJson: packetManifest as Prisma.InputJsonValue,
      includedArtifactIds: packetBase.includedArtifactIds,
      excludedArtifactIds: [],
      staleArtifactIds: [],
      reviewerRequired: false,
      assignedReviewerUserId: DEMO_USERS[1].id,
      reviewDueAt: tomorrow,
      approvedContactName: 'Jordan Lee',
      approvedContactEmail: 'trust@astera.example',
      lastExportedAt: twoDaysAgo,
      exportCount: 1,
      createdBy: DEMO_USER_ID,
      createdAt: twoDaysAgo
    }
  });

  const seededGrantToken = 'northbridge-buyer-grant-demo';

  await prisma.trustRoom.create({
    data: {
      id: DEMO_IDS.trustRoom,
      tenantId,
      trustPacketId: DEMO_IDS.trustPacket,
      trustInboxItemId: DEMO_IDS.trustInbox,
      questionnaireUploadId: DEMO_IDS.questionnaireUpload,
      name: 'Northbridge Payments Trust Room',
      slug: 'northbridge-payments-room',
      status: TrustRoomStatus.PUBLISHED,
      accessMode: TrustRoomAccessMode.REQUEST_ACCESS,
      roomSections: getDefaultTrustRoomSections(packetManifest),
      summaryText: 'Buyer-safe room with approved questionnaire answers, evidence posture, trust packet sections, and security contact details.',
      termsRequired: true,
      ndaRequired: true,
      publishedAt: twoDaysAgo,
      publishedBy: DEMO_USERS[1].id,
      createdBy: DEMO_USER_ID,
      createdAt: twoDaysAgo
    }
  });

  await prisma.trustRoomAccessRequest.createMany({
    data: [
      {
        id: DEMO_IDS.trustRoomRequestApproved,
        tenantId,
        trustRoomId: DEMO_IDS.trustRoom,
        trustPacketId: DEMO_IDS.trustPacket,
        trustInboxItemId: DEMO_IDS.trustInbox,
        questionnaireUploadId: DEMO_IDS.questionnaireUpload,
        requesterName: 'Nadia Gomez',
        requesterEmail: 'nadia.gomez@northbridge-payments.example',
        companyName: 'Northbridge Payments',
        requestReason: 'Review approved FAQ responses, the trust packet summary, and AI governance posture for procurement approval.',
        status: TrustRoomAccessRequestStatus.FULFILLED,
        assignedOwnerUserId: DEMO_USERS[1].id,
        internalNotes: `Seeded grant token for demo walkthrough: ${seededGrantToken}`,
        approvedAccessTokenHash: hashTrustRoomToken(seededGrantToken),
        approvedAt: oneDayAgo,
        respondedAt: oneDayAgo,
        lastViewedAt: addHours(oneDayAgo, 6),
        viewCount: 6,
        createdAt: twoDaysAgo
      },
      {
        id: DEMO_IDS.trustRoomRequestPending,
        tenantId,
        trustRoomId: DEMO_IDS.trustRoom,
        trustPacketId: DEMO_IDS.trustPacket,
        trustInboxItemId: DEMO_IDS.trustInbox,
        questionnaireUploadId: DEMO_IDS.questionnaireUpload,
        requesterName: 'Olivia Hart',
        requesterEmail: 'olivia.hart@northbridge-payments.example',
        companyName: 'Northbridge Payments',
        requestReason: 'Need external review access for legal and security sign-off.',
        status: TrustRoomAccessRequestStatus.PENDING,
        assignedOwnerUserId: DEMO_USERS[1].id,
        internalNotes: 'Hold until legal confirms NDA scope for the buyer review group.',
        createdAt: addHours(oneDayAgo, -8)
      }
    ]
  });

  await prisma.trustRoomEngagementEvent.createMany({
    data: [
      {
        tenantId,
        trustRoomId: DEMO_IDS.trustRoom,
        trustPacketId: DEMO_IDS.trustPacket,
        accessRequestId: DEMO_IDS.trustRoomRequestApproved,
        eventType: 'REQUEST_SUBMITTED',
        actorEmail: 'nadia.gomez@northbridge-payments.example',
        actorLabel: 'Nadia Gomez',
        metadata: { companyName: 'Northbridge Payments' },
        createdAt: twoDaysAgo
      },
      {
        tenantId,
        trustRoomId: DEMO_IDS.trustRoom,
        trustPacketId: DEMO_IDS.trustPacket,
        accessRequestId: DEMO_IDS.trustRoomRequestApproved,
        eventType: 'ACCESS_GRANTED',
        actorEmail: 'nadia.gomez@northbridge-payments.example',
        actorLabel: 'Nadia Gomez',
        metadata: { approvedBy: DEMO_USERS[1].id },
        createdAt: oneDayAgo
      },
      {
        tenantId,
        trustRoomId: DEMO_IDS.trustRoom,
        trustPacketId: DEMO_IDS.trustPacket,
        accessRequestId: DEMO_IDS.trustRoomRequestApproved,
        eventType: 'ROOM_VIEWED',
        actorEmail: 'nadia.gomez@northbridge-payments.example',
        actorLabel: 'Nadia Gomez',
        createdAt: addHours(oneDayAgo, 2)
      },
      {
        tenantId,
        trustRoomId: DEMO_IDS.trustRoom,
        trustPacketId: DEMO_IDS.trustPacket,
        accessRequestId: DEMO_IDS.trustRoomRequestApproved,
        eventType: 'SECTION_VIEWED',
        sectionKey: 'approved-security-faq',
        actorEmail: 'nadia.gomez@northbridge-payments.example',
        actorLabel: 'Nadia Gomez',
        createdAt: addHours(oneDayAgo, 2)
      },
      {
        tenantId,
        trustRoomId: DEMO_IDS.trustRoom,
        trustPacketId: DEMO_IDS.trustPacket,
        accessRequestId: DEMO_IDS.trustRoomRequestApproved,
        eventType: 'SECTION_VIEWED',
        sectionKey: 'evidence-map-summary',
        actorEmail: 'nadia.gomez@northbridge-payments.example',
        actorLabel: 'Nadia Gomez',
        createdAt: addHours(oneDayAgo, 3)
      },
      {
        tenantId,
        trustRoomId: DEMO_IDS.trustRoom,
        trustPacketId: DEMO_IDS.trustPacket,
        accessRequestId: DEMO_IDS.trustRoomRequestApproved,
        eventType: 'PACKET_DOWNLOADED',
        actorEmail: 'nadia.gomez@northbridge-payments.example',
        actorLabel: 'Nadia Gomez',
        metadata: { format: 'html' },
        createdAt: addHours(oneDayAgo, 4)
      },
      {
        tenantId,
        trustRoomId: DEMO_IDS.trustRoom,
        trustPacketId: DEMO_IDS.trustPacket,
        accessRequestId: DEMO_IDS.trustRoomRequestPending,
        eventType: 'REQUEST_SUBMITTED',
        actorEmail: 'olivia.hart@northbridge-payments.example',
        actorLabel: 'Olivia Hart',
        metadata: { companyName: 'Northbridge Payments' },
        createdAt: addHours(oneDayAgo, -8)
      }
    ]
  });

  await prisma.aIVendorReview.create({
    data: {
      id: DEMO_IDS.aiVendorReview,
      tenantId,
      vendorName: 'AnswerFlow AI',
      productName: 'AnswerFlow Copilot',
      primaryUseCase: 'Questionnaire drafting and evidence-backed trust response support',
      modelProvider: 'OpenAI',
      deploymentType: AIDeploymentContext.SAAS,
      authenticationSupport: AIYesNoUnknown.YES,
      loggingSupport: AIYesNoUnknown.YES,
      retentionPolicyStatus: AIRetentionStatus.UNKNOWN,
      trainsOnCustomerData: AIYesNoUnknown.UNKNOWN,
      subprocessorsStatus: AIYesNoUnknown.UNKNOWN,
      dpaStatus: AIDpaStatus.REQUESTED,
      securityDocsRequested: true,
      securityDocsReceived: true,
      dataClasses: [AIDataClass.INTERNAL, AIDataClass.CUSTOMER_METADATA],
      linkedPolicyIds: ['policy-ai-usage-standard'],
      matchedPolicyIds: ['policy-ai-usage-standard'],
      requiredConditions: [AIPolicyRequirement.APPROVED_VENDOR_ONLY, AIPolicyRequirement.LOGGING_REQUIRED, AIPolicyRequirement.RETENTION_MUST_BE_KNOWN],
      unmetRequirements: [AIPolicyRequirement.RETENTION_MUST_BE_KNOWN],
      approvalBlockers: [],
      decisionConditions: ['Confirm retention terms before unrestricted expansion.'],
      riskNotes: 'Vendor retention terms are still under review.',
      primaryRisks: ['Retention terms are not yet clear.', 'External model-provider dependency remains material.'],
      requiredControls: ['Centralize usage logging', 'Restrict input classes until retention is known'],
      ownerUserId: DEMO_USERS[2].id,
      assignedReviewerUserId: DEMO_USERS[1].id,
      reviewDueAt: twoDaysAgo,
      reviewerNotes: 'Approved with conditions for TrustOps use while retention terms and logging evidence stay under tracked follow-up.',
      riskTier: AIRiskTier.HIGH,
      status: AIGovernanceStatus.APPROVED_WITH_CONDITIONS,
      reviewedBy: DEMO_USERS[1].id,
      approvedBy: DEMO_USER_ID,
      reviewedAt: twoDaysAgo,
      approvedAt: twoDaysAgo,
      evidenceArtifactIds: [aiEvidence.id],
      linkedFindingIds: [DEMO_IDS.aiFinding],
      linkedRiskIds: [DEMO_IDS.riskAi],
      linkedTaskIds: [DEMO_IDS.aiTask],
      createdBy: DEMO_USER_ID,
      createdAt: threeDaysAgo
    }
  });

  await prisma.aIUseCase.create({
    data: {
      id: DEMO_IDS.aiUseCase,
      tenantId,
      vendorReviewId: DEMO_IDS.aiVendorReview,
      name: 'TrustOps questionnaire response copilot',
      description: 'Draft buyer answers from approved evidence before human approval.',
      businessOwner: 'Jordan Lee',
      department: 'Security',
      useCaseType: AIUseCaseType.SECURITY_WORKFLOW,
      workflowType: AIWorkflowType.ASSISTANT,
      vendorName: 'AnswerFlow AI',
      modelFamily: 'gpt-4o-mini',
      deploymentContext: AIDeploymentContext.SAAS,
      dataClasses: [AIDataClass.INTERNAL, AIDataClass.CUSTOMER_METADATA],
      allowedDataClasses: [AIDataClass.PUBLIC, AIDataClass.INTERNAL, AIDataClass.CUSTOMER_METADATA],
      restrictedDataClasses: [AIDataClass.CUSTOMER_DATA],
      prohibitedDataClasses: [AIDataClass.SECRETS, AIDataClass.PHI, AIDataClass.PCI],
      customerDataInvolved: AIYesNoUnknown.YES,
      regulatedDataInvolved: AIYesNoUnknown.NO,
      secretsInvolved: AIYesNoUnknown.NO,
      externalToolAccess: AIYesNoUnknown.NO,
      internetAccess: AIYesNoUnknown.YES,
      humanReviewRequired: true,
      riskTier: AIRiskTier.HIGH,
      status: AIGovernanceStatus.APPROVED_WITH_CONDITIONS,
      linkedPolicyIds: ['policy-ai-usage-standard'],
      matchedPolicyIds: ['policy-ai-usage-standard'],
      requiredConditions: [AIPolicyRequirement.HUMAN_REVIEW_REQUIRED, AIPolicyRequirement.APPROVED_VENDOR_ONLY, AIPolicyRequirement.LOGGING_REQUIRED, AIPolicyRequirement.RETENTION_MUST_BE_KNOWN],
      unmetRequirements: [],
      approvalBlockers: [],
      decisionConditions: ['Human review remains mandatory.', 'No secrets or regulated data may be submitted.', 'Vendor retention review must close before wider deployment.'],
      primaryRisks: ['Buyer-facing commitments could be overstated without review.', 'Vendor retention posture remains under review.'],
      requiredControls: ['Answer review queue', 'Tenant-scoped evidence only', 'Audit logging on every generation'],
      evidenceArtifactIds: [aiEvidence.id],
      assignedReviewerUserId: DEMO_USERS[1].id,
      reviewDueAt: twoDaysAgo,
      reviewerNotes: 'Conditionally approved for TrustOps only while vendor diligence completes.',
      reviewedBy: DEMO_USERS[1].id,
      approvedBy: DEMO_USER_ID,
      reviewedAt: twoDaysAgo,
      approvedAt: twoDaysAgo,
      linkedFindingIds: [DEMO_IDS.aiFinding],
      linkedRiskIds: [DEMO_IDS.riskAi],
      linkedTaskIds: [DEMO_IDS.aiTask],
      createdBy: DEMO_USER_ID,
      createdAt: threeDaysAgo
    }
  });

  await prisma.aIUseCase.create({
    data: {
      id: DEMO_IDS.aiUseCaseReview,
      tenantId,
      name: 'Customer renewal call summary assistant',
      description: 'Proposed workflow to summarize renewal calls and draft follow-up notes for revenue teams.',
      businessOwner: 'Leah Soto',
      department: 'Revenue Operations',
      useCaseType: AIUseCaseType.CUSTOMER_FACING,
      workflowType: AIWorkflowType.CONTENT_GENERATION,
      vendorName: 'NotePilot AI',
      modelFamily: 'gpt-4.1-mini',
      deploymentContext: AIDeploymentContext.SAAS,
      dataClasses: [AIDataClass.INTERNAL, AIDataClass.CUSTOMER_CONTENT, AIDataClass.PII],
      allowedDataClasses: [AIDataClass.PUBLIC, AIDataClass.INTERNAL],
      restrictedDataClasses: [AIDataClass.CUSTOMER_CONTENT, AIDataClass.PII],
      prohibitedDataClasses: [AIDataClass.SECRETS, AIDataClass.PHI, AIDataClass.PCI],
      customerDataInvolved: AIYesNoUnknown.YES,
      regulatedDataInvolved: AIYesNoUnknown.YES,
      secretsInvolved: AIYesNoUnknown.NO,
      externalToolAccess: AIYesNoUnknown.YES,
      internetAccess: AIYesNoUnknown.YES,
      humanReviewRequired: true,
      riskTier: AIRiskTier.HIGH,
      status: AIGovernanceStatus.NEEDS_REVIEW,
      linkedPolicyIds: ['policy-ai-usage-standard'],
      matchedPolicyIds: ['policy-ai-usage-standard'],
      requiredConditions: [
        AIPolicyRequirement.HUMAN_REVIEW_REQUIRED,
        AIPolicyRequirement.APPROVED_VENDOR_ONLY,
        AIPolicyRequirement.LOGGING_REQUIRED,
        AIPolicyRequirement.NO_REGULATED_DATA,
        AIPolicyRequirement.RETENTION_MUST_BE_KNOWN
      ],
      unmetRequirements: [
        AIPolicyRequirement.APPROVED_VENDOR_ONLY,
        AIPolicyRequirement.NO_REGULATED_DATA,
        AIPolicyRequirement.RETENTION_MUST_BE_KNOWN
      ],
      approvalBlockers: [
        AIPolicyRequirement.APPROVED_VENDOR_ONLY,
        AIPolicyRequirement.NO_REGULATED_DATA,
        AIPolicyRequirement.RETENTION_MUST_BE_KNOWN
      ],
      decisionConditions: [
        'Remain blocked until an approved vendor intake exists.',
        'Redact transcript PII before any external processing.',
        'Require human review before notes can be shared with customers.'
      ],
      primaryRisks: [
        'Customer call transcripts could be processed by an unapproved vendor.',
        'AI-generated renewal language could overstate product or security commitments.'
      ],
      requiredControls: ['Approved vendor intake', 'Transcript minimization and redaction', 'Human review before distribution'],
      evidenceArtifactIds: [aiEvidence.id],
      assignedReviewerUserId: DEMO_USERS[1].id,
      reviewDueAt: oneDayAgo,
      reviewerNotes: 'Hold for governance review until vendor intake, retention terms, and customer-data boundaries are approved.',
      linkedFindingIds: [DEMO_IDS.aiFindingReview],
      linkedRiskIds: [DEMO_IDS.riskAiReview],
      linkedTaskIds: [DEMO_IDS.aiTaskReview],
      createdBy: DEMO_USER_ID,
      createdAt: twoDaysAgo
    }
  });

  await prisma.task.create({
    data: {
      id: DEMO_IDS.aiTask,
      tenantId,
      aiUseCaseId: DEMO_IDS.aiUseCase,
      aiVendorReviewId: DEMO_IDS.aiVendorReview,
      title: 'Close AI vendor retention review and logging conditions',
      description: 'Resolve AnswerFlow AI retention terms and final approval conditions.',
      assignee: DEMO_USERS[2].name,
      dueDate: nextWeek,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      createdBy: DEMO_USER_ID,
      createdAt: twoDaysAgo
    }
  });

  await prisma.task.create({
    data: {
      id: DEMO_IDS.aiTaskReview,
      tenantId,
      aiUseCaseId: DEMO_IDS.aiUseCaseReview,
      title: 'Complete vendor intake and customer-data review for call summaries',
      description: 'Route the renewal-call summary workflow through approved vendor intake, transcript minimization, and human-review guardrails before any pilot.',
      assignee: DEMO_USERS[1].name,
      dueDate: nextWeek,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      createdBy: DEMO_USER_ID,
      createdAt: oneDayAgo
    }
  });

  await prisma.finding.create({
    data: {
      id: DEMO_IDS.aiFinding,
      tenantId,
      sourceType: FindingSourceType.AI_GOVERNANCE_HIGH_RISK,
      status: FindingStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      title: 'AI vendor retention terms remain unresolved',
      description: 'The approved AI use case still depends on unresolved vendor retention details.',
      ownerUserId: DEMO_USERS[2].id,
      taskId: DEMO_IDS.aiTask,
      aiUseCaseId: DEMO_IDS.aiUseCase,
      aiVendorReviewId: DEMO_IDS.aiVendorReview,
      createdBy: DEMO_USER_ID,
      createdAt: twoDaysAgo
    }
  });

  await prisma.finding.create({
    data: {
      id: DEMO_IDS.aiFindingReview,
      tenantId,
      sourceType: FindingSourceType.AI_GOVERNANCE_HIGH_RISK,
      status: FindingStatus.OPEN,
      priority: TaskPriority.HIGH,
      title: 'Customer call summary workflow lacks approved vendor and PII controls',
      description: 'The proposed renewal-call summary assistant is review-gated because customer transcript handling, vendor approval, and buyer-safe output controls are not yet in place.',
      ownerUserId: DEMO_USERS[1].id,
      taskId: DEMO_IDS.aiTaskReview,
      aiUseCaseId: DEMO_IDS.aiUseCaseReview,
      createdBy: DEMO_USER_ID,
      createdAt: oneDayAgo
    }
  });

  await prisma.incident.create({
    data: {
      id: DEMO_IDS.activeIncident,
      tenantId,
      title: 'AnswerFlow retention assurance vendor notice',
      description: 'Review a vendor notice that may affect retention assurances for the TrustOps copilot workflow.',
      incidentType: IncidentType.THIRD_PARTY_BREACH,
      severity: IncidentSeverity.HIGH,
      status: IncidentStatus.ACTIVE,
      detectionSource: 'Vendor advisory',
      reportedBy: 'Vendor management',
      incidentOwnerUserId: DEMO_USERS[2].id,
      communicationsOwnerUserId: DEMO_USERS[1].id,
      affectedSystems: ['TrustOps Copilot'],
      affectedServices: ['Questionnaire drafting'],
      affectedVendorNames: ['AnswerFlow AI'],
      aiUseCaseId: DEMO_IDS.aiUseCase,
      aiVendorReviewId: DEMO_IDS.aiVendorReview,
      questionnaireUploadId: DEMO_IDS.questionnaireUpload,
      trustInboxItemId: DEMO_IDS.trustInbox,
      startedAt: oneDayAgo,
      declaredAt: addHours(oneDayAgo, 1),
      nextUpdateDueAt: addHours(now, 4),
      executiveSummary: 'Vendor diligence is active because retention changes may affect buyer-facing AI assurances.',
      internalNotes: 'Keep the trust reviewer looped in before any external statement changes.',
      linkedFindingIds: [DEMO_IDS.activeIncidentFinding],
      linkedRiskIds: [DEMO_IDS.riskIncident],
      linkedBoardBriefIds: [DEMO_IDS.boardBrief],
      linkedQuarterlyReviewIds: [DEMO_IDS.quarterlyReview],
      createdBy: DEMO_USER_ID,
      createdAt: oneDayAgo
    }
  });

  await prisma.incidentRunbookPack.create({
    data: {
      id: DEMO_IDS.activeIncidentPack,
      tenantId,
      incidentId: DEMO_IDS.activeIncident,
      runbookId: 'third-party-breach',
      title: 'Third-Party Breach Response Pack',
      summary: 'Contain blast radius, rotate trust-chain credentials, and align buyer communications.',
      status: IncidentRunbookPackStatus.ACTIVE,
      createdBy: DEMO_USER_ID,
      createdAt: oneDayAgo
    }
  });

  await prisma.task.createMany({
    data: [
      { id: DEMO_IDS.activeIncidentTaskTriage, tenantId, incidentId: DEMO_IDS.activeIncident, incidentRunbookPackId: DEMO_IDS.activeIncidentPack, title: 'Assess blast radius of impacted vendor integrations', description: 'Confirm what buyer workflows and credentials are affected.', assignee: DEMO_USERS[2].name, dueDate: addHours(now, -2), status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, responseOpsPhase: ResponseOpsPhase.TRIAGE, responseOpsOrder: 1, createdBy: DEMO_USER_ID, createdAt: oneDayAgo },
      { id: DEMO_IDS.activeIncidentTaskContainment, tenantId, incidentId: DEMO_IDS.activeIncident, incidentRunbookPackId: DEMO_IDS.activeIncidentPack, title: 'Rotate shared secrets and integration credentials', description: 'Rotate the vendor token and limit non-essential access.', assignee: DEMO_USERS[2].name, dueDate: addHours(now, 6), status: TaskStatus.TODO, priority: TaskPriority.HIGH, responseOpsPhase: ResponseOpsPhase.CONTAINMENT, responseOpsOrder: 2, createdBy: DEMO_USER_ID, createdAt: oneDayAgo },
      { id: DEMO_IDS.activeIncidentTaskCommunications, tenantId, incidentId: DEMO_IDS.activeIncident, incidentRunbookPackId: DEMO_IDS.activeIncidentPack, title: 'Update trust packet and customer communication notes', description: 'Prepare buyer-safe language that reflects current vendor-review status.', assignee: DEMO_USERS[1].name, dueDate: tomorrow, status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, responseOpsPhase: ResponseOpsPhase.COMMUNICATIONS, responseOpsOrder: 3, createdBy: DEMO_USER_ID, createdAt: oneDayAgo }
    ]
  });
  await prisma.incidentTimelineEvent.createMany({
    data: [
      { tenantId, incidentId: DEMO_IDS.activeIncident, eventType: IncidentTimelineEventType.CREATED, title: 'Incident record opened from vendor notice', detail: 'Vendor advisory triggered a formal incident record for the TrustOps copilot workflow.', isShareable: false, createdBy: DEMO_USER_ID, createdAt: oneDayAgo },
      { tenantId, incidentId: DEMO_IDS.activeIncident, eventType: IncidentTimelineEventType.TRIAGE_STARTED, title: 'Triage started with Response Ops owner assigned', detail: 'Incident owner and trust communications owner were assigned in the first hour.', isShareable: false, createdBy: DEMO_USERS[2].id, createdAt: addHours(oneDayAgo, 1) },
      { tenantId, incidentId: DEMO_IDS.activeIncident, eventType: IncidentTimelineEventType.RUNBOOK_LAUNCHED, title: 'Third-party breach runbook pack launched', detail: 'Containment, communications, and trust packet update tasks were staged.', isShareable: true, createdBy: DEMO_USERS[2].id, createdAt: addHours(oneDayAgo, 2) },
      { tenantId, incidentId: DEMO_IDS.activeIncident, eventType: IncidentTimelineEventType.DECISION_LOG, title: 'External communications remain review-gated', detail: 'No external statement will reference vendor retention assurances until AI governance and trust review are aligned.', isShareable: false, createdBy: DEMO_USERS[1].id, createdAt: addHours(oneDayAgo, 3) }
    ]
  });

  await prisma.finding.create({
    data: {
      id: DEMO_IDS.activeIncidentFinding,
      tenantId,
      sourceType: FindingSourceType.RESPONSE_OPS_INCIDENT,
      status: FindingStatus.OPEN,
      priority: TaskPriority.HIGH,
      title: 'Vendor-linked incident is still affecting trust messaging',
      description: 'The active vendor-linked incident requires a trust-packet update and continued containment work.',
      ownerUserId: DEMO_USERS[2].id,
      taskId: DEMO_IDS.activeIncidentTaskContainment,
      incidentId: DEMO_IDS.activeIncident,
      createdBy: DEMO_USER_ID,
      createdAt: oneDayAgo
    }
  });

  await prisma.incident.create({
    data: {
      id: DEMO_IDS.resolvedIncident,
      tenantId,
      title: 'Privileged mailbox phishing attempt',
      description: 'A privileged mailbox reported suspicious email activity and was contained quickly.',
      incidentType: IncidentType.PHISHING,
      severity: IncidentSeverity.MEDIUM,
      status: IncidentStatus.POST_INCIDENT_REVIEW,
      detectionSource: 'User report',
      reportedBy: 'Support manager',
      incidentOwnerUserId: DEMO_USERS[2].id,
      communicationsOwnerUserId: DEMO_USERS[1].id,
      affectedSystems: ['Mail'],
      affectedServices: ['Executive communications'],
      startedAt: fiveDaysAgo,
      declaredAt: addHours(fiveDaysAgo, 1),
      containedAt: addHours(fiveDaysAgo, 3),
      resolvedAt: addHours(fiveDaysAgo, 8),
      nextUpdateDueAt: addDays(now, 2),
      executiveSummary: 'Containment was successful and follow-up work is focused on playbook updates.',
      linkedFindingIds: [DEMO_IDS.afterActionFinding],
      createdBy: DEMO_USER_ID,
      createdAt: fiveDaysAgo
    }
  });

  await prisma.task.create({
    data: {
      id: DEMO_IDS.postIncidentTask,
      tenantId,
      incidentId: DEMO_IDS.resolvedIncident,
      title: 'Refresh mailbox phishing escalation playbook',
      description: 'Update the first-hour phishing playbook with mailbox triage and communications checkpoints.',
      assignee: DEMO_USERS[2].name,
      dueDate: nextWeek,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      responseOpsPhase: ResponseOpsPhase.POST_INCIDENT_REVIEW,
      responseOpsOrder: 1,
      createdBy: DEMO_USER_ID,
      createdAt: twoDaysAgo
    }
  });

  await prisma.afterActionReport.create({
    data: {
      id: DEMO_IDS.afterAction,
      tenantId,
      incidentId: DEMO_IDS.resolvedIncident,
      title: 'Privileged mailbox phishing after-action',
      status: AfterActionReportStatus.APPROVED,
      summary: 'The phishing attempt was contained quickly and follow-up work focuses on mailbox triage discipline.',
      affectedScope: 'One privileged mailbox and related executive communication paths.',
      timelineSummary: ['Mailbox report received and triaged quickly.', 'Sessions were revoked and messages quarantined.', 'Playbook improvements were assigned.'],
      actionsTaken: ['Revoked active sessions.', 'Captured mailbox evidence.', 'Aligned communications ownership.'],
      currentStatus: 'One follow-up task remains open for playbook refresh.',
      lessonsLearned: ['Mailbox triage was fast once ownership was explicit.', 'Evidence capture should be staged earlier.'],
      followUpActions: ['Refresh the mailbox phishing escalation playbook.'],
      decisionsNeeded: ['Decide whether mailbox escalation training becomes mandatory for executive support staff.'],
      linkedFindingIds: [DEMO_IDS.afterActionFinding],
      linkedRiskIds: [DEMO_IDS.riskIncident],
      linkedTaskIds: [DEMO_IDS.postIncidentTask],
      reviewerNotes: 'Approved for leadership and quarterly review reference.',
      createdBy: DEMO_USER_ID,
      reviewedBy: DEMO_USERS[1].id,
      approvedBy: DEMO_USER_ID,
      reviewedAt: oneDayAgo,
      approvedAt: oneDayAgo,
      lastExportedAt: oneDayAgo,
      exportCount: 1,
      createdAt: twoDaysAgo
    }
  });

  await prisma.finding.create({
    data: {
      id: DEMO_IDS.afterActionFinding,
      tenantId,
      sourceType: FindingSourceType.RESPONSE_OPS_AFTER_ACTION,
      status: FindingStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      title: 'Mailbox phishing playbook needs post-incident update',
      description: 'The after-action review identified a need to tighten mailbox escalation and communications sequencing.',
      ownerUserId: DEMO_USERS[2].id,
      taskId: DEMO_IDS.postIncidentTask,
      incidentId: DEMO_IDS.resolvedIncident,
      createdBy: DEMO_USER_ID,
      createdAt: twoDaysAgo
    }
  });

  await prisma.tabletopExercise.create({
    data: {
      id: DEMO_IDS.tabletop,
      tenantId,
      title: 'Q2 ransomware leadership tabletop',
      scenarioType: IncidentType.RANSOMWARE,
      status: 'COMPLETED',
      exerciseDate: oneDayAgo,
      participantNames: DEMO_USERS.map((user) => user.name),
      participantRoles: ['Executive sponsor', 'Trust lead', 'Incident commander'],
      scenarioSummary: 'Exercise a first-hour ransomware and buyer-communications scenario across the suite.',
      exerciseObjectives: ['Confirm first-hour ownership.', 'Validate buyer and executive communications.', 'Identify roadmap work after the exercise.'],
      expectedDecisions: ['Whether to isolate a shared SaaS dependency immediately.', 'When to brief leadership and update trust materials.'],
      exerciseNotes: 'Leadership completed the exercise and routed follow-up into Pulse instead of leaving it as a slide-deck takeaway.',
      decisionsMade: ['Pre-approve a buyer-impact update path for ransomware scenarios.', 'Stage one leadership continuity brief before the next quarterly review.'],
      gapsIdentified: ['Buyer-impact communications are not pre-staged for ransomware scenarios.', 'Leadership continuity talking points need a durable approval owner.'],
      followUpActions: ['Publish the ransomware buyer-impact briefing pack and carry the gap into Pulse.'],
      linkedFindingIds: [DEMO_IDS.tabletopFinding],
      linkedRiskIds: [DEMO_IDS.riskTabletop],
      linkedTaskIds: [DEMO_IDS.tabletopTask],
      completedBy: DEMO_USERS[1].id,
      completedAt: oneDayAgo,
      createdBy: DEMO_USER_ID,
      createdAt: twoDaysAgo
    }
  });

  await prisma.task.create({
    data: {
      id: DEMO_IDS.tabletopTask,
      tenantId,
      tabletopExerciseId: DEMO_IDS.tabletop,
      title: 'Publish ransomware buyer-impact briefing pack',
      description: 'Convert tabletop decisions into a reusable leadership and buyer-impact communications pack before the next quarterly review.',
      assignee: DEMO_USERS[1].name,
      dueDate: nextWeek,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      createdBy: DEMO_USER_ID,
      createdAt: oneDayAgo
    }
  });

  await prisma.finding.create({
    data: {
      id: DEMO_IDS.tabletopFinding,
      tenantId,
      sourceType: FindingSourceType.RESPONSE_OPS_TABLETOP,
      status: FindingStatus.OPEN,
      priority: TaskPriority.MEDIUM,
      title: 'Ransomware buyer-impact communications pack is not yet staged',
      description: 'The leadership tabletop confirmed that ransomware communications would still be too manual for a buyer-impacting outage.',
      ownerUserId: DEMO_USERS[1].id,
      taskId: DEMO_IDS.tabletopTask,
      tabletopExerciseId: DEMO_IDS.tabletop,
      createdBy: DEMO_USER_ID,
      createdAt: oneDayAgo
    }
  });

  await prisma.riskRegisterItem.createMany({
    data: [
      { id: DEMO_IDS.riskTrust, tenantId, title: 'Buyer-facing data residency commitments are not yet standardized', normalizedRiskStatement: 'buyer-facing data residency commitments remain unapproved', description: 'TrustOps cannot safely approve customer-specific residency claims until product and legal validation is complete.', businessImpactSummary: 'Procurement cycles may stall if buyer-safe language is not resolved quickly.', sourceType: RiskRegisterSourceType.TRUSTOPS_EVIDENCE_GAP, sourceModule: PulseSourceModule.TRUSTOPS, sourceKey: DEMO_IDS.riskTrust, sourceReference: DEMO_IDS.questionnaireUpload, severity: RiskLevel.HIGH, likelihood: RiskLevel.MEDIUM, impact: RiskLevel.HIGH, status: RiskRegisterStatus.OPEN, ownerUserId: DEMO_USERS[1].id, targetDueAt: twoWeeksOut, linkedFindingIds: [DEMO_IDS.trustFinding], linkedTaskIds: [DEMO_IDS.trustTask], linkedQuestionnaireIds: [DEMO_IDS.questionnaireUpload], linkedEvidenceMapIds: [DEMO_IDS.evidenceMap], linkedTrustPacketIds: [DEMO_IDS.trustPacket], createdBy: DEMO_USER_ID, createdAt: twoDaysAgo },
      { id: DEMO_IDS.riskAi, tenantId, title: 'AI copilot expansion is gated by vendor retention diligence', normalizedRiskStatement: 'ai copilot expansion is gated by vendor retention diligence', description: 'The TrustOps copilot is conditionally approved, but vendor retention uncertainty still blocks broader rollout.', businessImpactSummary: 'AI Governance adoption is slowed until vendor diligence closes.', sourceType: RiskRegisterSourceType.AI_USE_CASE, sourceModule: PulseSourceModule.AI_GOVERNANCE, sourceKey: DEMO_IDS.riskAi, sourceReference: DEMO_IDS.aiUseCase, severity: RiskLevel.HIGH, likelihood: RiskLevel.HIGH, impact: RiskLevel.HIGH, status: RiskRegisterStatus.IN_REVIEW, ownerUserId: DEMO_USERS[2].id, targetDueAt: threeWeeksOut, linkedControlIds: [aiTieringQuestion.control.id], linkedFindingIds: [DEMO_IDS.aiFinding], linkedTaskIds: [DEMO_IDS.aiTask], linkedAiUseCaseIds: [DEMO_IDS.aiUseCase], linkedAiVendorReviewIds: [DEMO_IDS.aiVendorReview], createdBy: DEMO_USER_ID, createdAt: twoDaysAgo },
      { id: DEMO_IDS.riskAiReview, tenantId, title: 'Customer call transcript summarization is not approved for external AI use', normalizedRiskStatement: 'customer call transcript summarization lacks approved ai controls', description: 'The proposed renewal-call summary assistant would handle customer transcripts and PII without an approved vendor intake or restricted-data workflow.', businessImpactSummary: 'An ungoverned rollout would create customer trust, procurement, and data-handling exposure.', sourceType: RiskRegisterSourceType.AI_USE_CASE, sourceModule: PulseSourceModule.AI_GOVERNANCE, sourceKey: DEMO_IDS.riskAiReview, sourceReference: DEMO_IDS.aiUseCaseReview, severity: RiskLevel.HIGH, likelihood: RiskLevel.MEDIUM, impact: RiskLevel.HIGH, status: RiskRegisterStatus.OPEN, ownerUserId: DEMO_USERS[1].id, targetDueAt: nextWeek, linkedFindingIds: [DEMO_IDS.aiFindingReview], linkedTaskIds: [DEMO_IDS.aiTaskReview], linkedAiUseCaseIds: [DEMO_IDS.aiUseCaseReview], createdBy: DEMO_USER_ID, createdAt: oneDayAgo },
      { id: DEMO_IDS.riskIncident, tenantId, title: 'Vendor-linked incident still affects trust and executive reporting', normalizedRiskStatement: 'vendor-linked incident still affects trust and executive reporting', description: 'The active vendor-linked incident is not fully contained from a trust and reporting perspective.', businessImpactSummary: 'Incident carry-over continues to affect buyer trust messaging and executive updates.', sourceType: RiskRegisterSourceType.INCIDENT, sourceModule: PulseSourceModule.RESPONSE_OPS, sourceKey: DEMO_IDS.riskIncident, sourceReference: DEMO_IDS.activeIncident, severity: RiskLevel.CRITICAL, likelihood: RiskLevel.MEDIUM, impact: RiskLevel.HIGH, status: RiskRegisterStatus.MITIGATING, ownerUserId: DEMO_USERS[2].id, targetDueAt: nextWeek, linkedFindingIds: [DEMO_IDS.activeIncidentFinding, DEMO_IDS.afterActionFinding], linkedTaskIds: [DEMO_IDS.activeIncidentTaskTriage, DEMO_IDS.activeIncidentTaskContainment, DEMO_IDS.activeIncidentTaskCommunications, DEMO_IDS.postIncidentTask], linkedIncidentIds: [DEMO_IDS.activeIncident, DEMO_IDS.resolvedIncident], createdBy: DEMO_USER_ID, createdAt: oneDayAgo },
      { id: DEMO_IDS.riskTabletop, tenantId, title: 'Ransomware buyer-impact communications are still too manual', normalizedRiskStatement: 'ransomware buyer impact communications remain too manual', description: 'The completed leadership tabletop showed that customer and buyer-impact communications would still rely on ad hoc drafting during a ransomware event.', businessImpactSummary: 'Leadership confidence and buyer trust would degrade if outage communications are improvised.', sourceType: RiskRegisterSourceType.TABLETOP, sourceModule: PulseSourceModule.RESPONSE_OPS, sourceKey: DEMO_IDS.riskTabletop, sourceReference: DEMO_IDS.tabletop, severity: RiskLevel.MEDIUM, likelihood: RiskLevel.MEDIUM, impact: RiskLevel.HIGH, status: RiskRegisterStatus.OPEN, ownerUserId: DEMO_USERS[1].id, targetDueAt: nextWeek, linkedFindingIds: [DEMO_IDS.tabletopFinding], linkedTaskIds: [DEMO_IDS.tabletopTask], linkedTabletopIds: [DEMO_IDS.tabletop], createdBy: DEMO_USER_ID, createdAt: oneDayAgo }
    ]
  });
  await prisma.pulseSnapshot.create({
    data: {
      id: DEMO_IDS.pulseSnapshot,
      tenantId,
      name: 'Q1 executive posture scorecard',
      periodType: PulseSnapshotPeriodType.QUARTERLY,
      reportingPeriod: DEMO_REPORTING_PERIOD,
      snapshotDate: now,
      status: PulseSnapshotStatus.PUBLISHED,
      overallScore: 74,
      overallDelta: 6,
      assessmentSignalScore: 78,
      findingsSignalScore: 68,
      remediationSignalScore: 71,
      trustSignalScore: 76,
      readinessSignalScore: 73,
      openFindingsCount: 6,
      overdueFindingsCount: 1,
      overdueTasksCount: 2,
      openEvidenceGapCount: 1,
      trustReviewBacklogCount: 3,
      answerReuseCount: 29,
      trustPacketsExportedCount: 1,
      assessedControlCount: 4,
      summaryText: 'TrustOps is producing buyer-ready outputs, one customer-data AI workflow remains review-gated, and incident plus tabletop follow-up are now feeding the executive roadmap.',
      measuredInputsJson: { assessmentSignals: { assessmentsInProgress: 1, assessedControls: 4 }, trustSignals: { backlog: 1, overdueReviews: 2, openEvidenceGaps: 1, answerReuseCount: 29 }, aiSignals: { openReviews: 1, conditionalApprovals: 2, highRiskItems: 3 }, responseSignals: { activeIncidents: 1, overdueIncidentActions: 1, postIncidentActions: 1, tabletopFollowUps: 1 } },
      createdBy: DEMO_USER_ID,
      reviewedBy: DEMO_USERS[1].id,
      approvedBy: DEMO_USER_ID,
      reviewedAt: oneDayAgo,
      approvedAt: oneDayAgo,
      publishedAt: oneDayAgo,
      createdAt: oneDayAgo
    }
  });

  await prisma.pulseCategoryScore.createMany({
    data: [
      { id: DEMO_IDS.pulseCategoryAssessment, tenantId, snapshotId: DEMO_IDS.pulseSnapshot, categoryKey: 'assessment-signal', label: 'Assessment Signal', score: 78, delta: 4, weight: 1, measuredValue: 4, benchmarkValue: 4, summaryText: 'Assessment coverage is strong and one review remains in motion.', createdAt: oneDayAgo },
      { id: DEMO_IDS.pulseCategoryFindings, tenantId, snapshotId: DEMO_IDS.pulseSnapshot, categoryKey: 'findings', label: 'Findings Pressure', score: 68, delta: 3, weight: 1, measuredValue: 6, benchmarkValue: 2, summaryText: 'Open trust, AI, incident, and tabletop findings still require closeout.', createdAt: oneDayAgo },
      { id: DEMO_IDS.pulseCategoryRemediation, tenantId, snapshotId: DEMO_IDS.pulseSnapshot, categoryKey: 'remediation', label: 'Remediation Execution', score: 71, delta: 5, weight: 1, measuredValue: 4, benchmarkValue: 3, summaryText: 'One trust item and one incident action are still overdue.', createdAt: oneDayAgo },
      { id: DEMO_IDS.pulseCategoryTrust, tenantId, snapshotId: DEMO_IDS.pulseSnapshot, categoryKey: 'trustops', label: 'TrustOps Readiness', score: 76, delta: 7, weight: 1, measuredValue: 3, benchmarkValue: 4, summaryText: 'Trust packet export and answer reuse are strong, with one buyer commitment still under review.', createdAt: oneDayAgo },
      { id: DEMO_IDS.pulseCategoryReadiness, tenantId, snapshotId: DEMO_IDS.pulseSnapshot, categoryKey: 'readiness', label: 'Operational Readiness', score: 73, delta: 2, weight: 1, measuredValue: 3, benchmarkValue: 4, summaryText: 'Response Ops is live, with a completed tabletop now feeding roadmap follow-up.', createdAt: oneDayAgo }
    ]
  });

  await prisma.pulseRoadmap.create({
    data: {
      id: DEMO_IDS.roadmap,
      tenantId,
      snapshotId: DEMO_IDS.pulseSnapshot,
      name: 'Q2 30/60/90 risk reduction roadmap',
      reportingPeriod: DEMO_REPORTING_PERIOD,
      status: RoadmapStatus.APPROVED,
      reviewerNotes: 'Focus 30-day work on buyer-safe commitments and incident carry-over.',
      createdBy: DEMO_USER_ID,
      reviewedBy: DEMO_USERS[1].id,
      approvedBy: DEMO_USER_ID,
      reviewedAt: oneDayAgo,
      approvedAt: oneDayAgo,
      createdAt: oneDayAgo
    }
  });

  await prisma.roadmapItem.createMany({
    data: [
      { id: DEMO_IDS.roadmap30, tenantId, roadmapId: DEMO_IDS.roadmap, title: 'Resolve buyer-safe data residency language', horizon: RoadmapHorizon.DAYS_30, ownerUserId: DEMO_USERS[1].id, dueAt: addHours(now, -12), status: RoadmapItemStatus.IN_PROGRESS, rationale: 'Close the top TrustOps evidence gap affecting procurement responses.', expectedImpact: 'Reduce buyer review friction and unblock trust packet reuse.', linkedRiskIds: [DEMO_IDS.riskTrust], linkedFindingIds: [DEMO_IDS.trustFinding], linkedTaskIds: [DEMO_IDS.trustTask], createdAt: oneDayAgo },
      { id: DEMO_IDS.roadmap60, tenantId, roadmapId: DEMO_IDS.roadmap, title: 'Complete AI vendor retention review and customer-data guardrails', horizon: RoadmapHorizon.DAYS_60, ownerUserId: DEMO_USERS[2].id, dueAt: threeWeeksOut, status: RoadmapItemStatus.PLANNED, rationale: 'Move the approved TrustOps copilot forward while keeping the customer-call summary workflow blocked until controls exist.', expectedImpact: 'Differentiate approved internal AI from unapproved customer-data expansion and reduce executive concern around rollout.', linkedRiskIds: [DEMO_IDS.riskAi, DEMO_IDS.riskAiReview], linkedFindingIds: [DEMO_IDS.aiFinding, DEMO_IDS.aiFindingReview], linkedTaskIds: [DEMO_IDS.aiTask, DEMO_IDS.aiTaskReview], linkedControlIds: [aiTieringQuestion.control.id], createdAt: oneDayAgo },
      { id: DEMO_IDS.roadmap90, tenantId, roadmapId: DEMO_IDS.roadmap, title: 'Operationalize incident communications and tabletop follow-up', horizon: RoadmapHorizon.DAYS_90, ownerUserId: DEMO_USERS[2].id, dueAt: tenWeeksOut, status: RoadmapItemStatus.PLANNED, rationale: 'Convert incident lessons and the completed ransomware tabletop into repeatable workflows.', expectedImpact: 'Strengthen premium Response Ops positioning and quarterly review quality.', linkedRiskIds: [DEMO_IDS.riskIncident, DEMO_IDS.riskTabletop], linkedFindingIds: [DEMO_IDS.activeIncidentFinding, DEMO_IDS.afterActionFinding, DEMO_IDS.tabletopFinding], linkedTaskIds: [DEMO_IDS.postIncidentTask, DEMO_IDS.tabletopTask], createdAt: oneDayAgo }
    ]
  });

  await prisma.boardBrief.create({
    data: {
      id: DEMO_IDS.boardBrief,
      tenantId,
      snapshotId: DEMO_IDS.pulseSnapshot,
      roadmapId: DEMO_IDS.roadmap,
      title: 'Q1 board brief - cyber posture and buyer readiness',
      reportingPeriod: DEMO_REPORTING_PERIOD,
      status: BoardBriefStatus.APPROVED,
      overallPostureSummary: 'Core posture is stronger than last quarter, but buyer commitment discipline, one customer-data AI workflow still held in review, a live vendor-linked incident, and tabletop communications follow-up all need visible ownership.',
      topRiskIds: [DEMO_IDS.riskTrust, DEMO_IDS.riskAi, DEMO_IDS.riskAiReview, DEMO_IDS.riskIncident],
      notableImprovements: ['Approved answer reuse is reducing questionnaire turnaround.', 'AI Governance now separates conditional approvals from blocked customer-data workflows.', 'Response Ops after-action and tabletop follow-up are now feeding Pulse.'],
      overdueActions: ['Resolve the overdue trust review for buyer data residency language.', 'Clear the overdue AI review for customer call summaries.'],
      leadershipDecisionsNeeded: ['Confirm interim language limits for customer-specific residency commitments.', 'Decide whether the TrustOps copilot can expand before vendor retention diligence closes.', 'Keep the customer call summary assistant blocked until vendor intake and transcript controls are approved.', 'Review tolerance for vendor-linked incident carry-over into next quarter.'],
      roadmap30Days: ['Resolve buyer-safe data residency language and clear the overdue trust task.'],
      roadmap60Days: ['Close vendor retention follow-up and decide whether the blocked customer-call summary workflow remains out of scope.'],
      roadmap90Days: ['Publish the ransomware buyer-impact briefing pack and operationalize recurring tabletop follow-up.'],
      reviewerNotes: 'Ready for executive review and board pack assembly.',
      createdBy: DEMO_USER_ID,
      reviewedBy: DEMO_USERS[1].id,
      approvedBy: DEMO_USER_ID,
      reviewedAt: oneDayAgo,
      approvedAt: oneDayAgo,
      lastExportedAt: oneDayAgo,
      exportCount: 1,
      createdAt: oneDayAgo
    }
  });

  await prisma.quarterlyReview.create({
    data: {
      id: DEMO_IDS.quarterlyReview,
      tenantId,
      snapshotId: DEMO_IDS.pulseSnapshot,
      roadmapId: DEMO_IDS.roadmap,
      boardBriefId: DEMO_IDS.boardBrief,
      reviewPeriod: DEMO_REPORTING_PERIOD,
      reviewDate: now,
      attendeeNames: DEMO_USERS.map((user) => user.name),
      notes: 'Quarterly review focused on procurement pressure, review-gated AI expansion, and turning response lessons into durable executive follow-up.',
      decisionsMade: ['Keep buyer-facing residency commitments review-gated until legal confirms language.', 'Maintain conditional approval on the TrustOps copilot until vendor retention is documented.', 'Keep the customer call summary assistant blocked until vendor intake and transcript redaction controls are approved.', 'Carry the vendor-linked incident into Pulse and executive review until containment closes.'],
      followUpActions: ['Close the overdue trust task within the next week.', 'Finish AI vendor retention review within the next 21 days.', 'Resolve the customer call summary governance review within the next 14 days.', 'Publish the ransomware buyer-impact briefing pack before the next executive update.'],
      topRiskIds: [DEMO_IDS.riskTrust, DEMO_IDS.riskAi, DEMO_IDS.riskAiReview, DEMO_IDS.riskIncident],
      status: QuarterlyReviewStatus.FINALIZED,
      createdBy: DEMO_USER_ID,
      finalizedBy: DEMO_USER_ID,
      finalizedAt: now,
      createdAt: now
    }
  });

  await prisma.connectorConfig.createMany({
    data: [
      {
        id: DEMO_IDS.connectorSlack,
        tenantId,
        provider: ConnectorProvider.SLACK,
        name: 'Security Ops Slack',
        description: 'Routes buyer requests, incident starts, and quarterly review updates into the demo operations channel.',
        mode: ConnectorMode.SIMULATED,
        status: ConnectorStatus.ACTIVE,
        configJson: {
          defaultChannel: '#security-ops',
          enabledEventKeys: ['trust_room_request_received', 'incident_created', 'quarterly_review_ready']
        } satisfies Prisma.InputJsonObject,
        secretCiphertext: encryptConnectorSecret(
          JSON.stringify({ webhookUrl: 'https://hooks.slack.example/services/demo/vantage' })
        ),
        lastHealthStatus: ConnectorActivityStatus.SUCCEEDED,
        lastHealthCheckedAt: oneDayAgo,
        lastSuccessAt: oneDayAgo,
        createdBy: DEMO_USER_ID,
        updatedBy: DEMO_USER_ID,
        createdAt: twoDaysAgo,
        updatedAt: oneDayAgo
      },
      {
        id: DEMO_IDS.connectorJira,
        tenantId,
        provider: ConnectorProvider.JIRA,
        name: 'Delivery Jira Sync',
        description: 'Creates or refreshes delivery issues for open findings, risks, incident tasks, and roadmap items.',
        mode: ConnectorMode.SIMULATED,
        status: ConnectorStatus.ACTIVE,
        configJson: {
          jiraBaseUrl: 'https://vantage-demo.atlassian.net',
          jiraProjectKey: 'SEC',
          jiraIssueType: 'Task',
          jiraEmail: 'jira@astera.example',
          statusMappings: [
            { source: 'OPEN', target: 'to-do' },
            { source: 'IN_PROGRESS', target: 'in-progress' },
            { source: 'PLANNED', target: 'queued' }
          ]
        } satisfies Prisma.InputJsonObject,
        secretCiphertext: encryptConnectorSecret(JSON.stringify({ jiraApiToken: 'jira-demo-token' })),
        lastHealthStatus: ConnectorActivityStatus.SUCCEEDED,
        lastHealthCheckedAt: oneDayAgo,
        lastSuccessAt: oneDayAgo,
        createdBy: DEMO_USER_ID,
        updatedBy: DEMO_USER_ID,
        createdAt: twoDaysAgo,
        updatedAt: oneDayAgo
      },
      {
        id: DEMO_IDS.connectorConfluence,
        tenantId,
        provider: ConnectorProvider.CONFLUENCE,
        name: 'Leadership Confluence Publisher',
        description: 'Publishes board briefs, quarterly reviews, and share-safe reports into a buyer-ready knowledge space.',
        mode: ConnectorMode.SIMULATED,
        status: ConnectorStatus.ACTIVE,
        configJson: {
          confluenceBaseUrl: 'https://vantage-demo.atlassian.net',
          confluenceSpaceKey: 'SEC',
          confluenceParentPageId: '100100',
          confluenceEmail: 'docs@astera.example'
        } satisfies Prisma.InputJsonObject,
        secretCiphertext: encryptConnectorSecret(JSON.stringify({ confluenceApiToken: 'confluence-demo-token' })),
        lastHealthStatus: ConnectorActivityStatus.SUCCEEDED,
        lastHealthCheckedAt: oneDayAgo,
        lastSuccessAt: oneDayAgo,
        createdBy: DEMO_USER_ID,
        updatedBy: DEMO_USER_ID,
        createdAt: twoDaysAgo,
        updatedAt: oneDayAgo
      },
      {
        id: DEMO_IDS.connectorWebhook,
        tenantId,
        provider: ConnectorProvider.OUTBOUND_WEBHOOK,
        name: 'Automation Hook',
        description: 'Sends narrow operational payloads into downstream automations without expanding into a full iPaaS.',
        mode: ConnectorMode.SIMULATED,
        status: ConnectorStatus.ACTIVE,
        configJson: {
          outboundWebhookUrl: 'https://automation.example.test/hooks/vantage',
          enabledEventKeys: ['trust_room_request_received', 'incident_created']
        } satisfies Prisma.InputJsonObject,
        secretCiphertext: encryptConnectorSecret(JSON.stringify({ outboundWebhookSecret: 'automation-demo-secret' })),
        lastHealthStatus: ConnectorActivityStatus.SUCCEEDED,
        lastHealthCheckedAt: oneDayAgo,
        lastSuccessAt: oneDayAgo,
        createdBy: DEMO_USER_ID,
        updatedBy: DEMO_USER_ID,
        createdAt: twoDaysAgo,
        updatedAt: oneDayAgo
      }
    ]
  });

  await prisma.connectorObjectLink.createMany({
    data: [
      {
        tenantId,
        connectorId: DEMO_IDS.connectorJira,
        provider: ConnectorProvider.JIRA,
        entityType: 'risk',
        entityId: DEMO_IDS.riskTrust,
        externalObjectId: 'SEC-201',
        externalObjectKey: 'SEC-201',
        externalObjectUrl: 'https://vantage-demo.atlassian.net/browse/SEC-201',
        lastSyncStatus: ConnectorActivityStatus.SUCCEEDED,
        lastSyncedAt: oneDayAgo,
        createdAt: oneDayAgo,
        updatedAt: oneDayAgo
      },
      {
        tenantId,
        connectorId: DEMO_IDS.connectorJira,
        provider: ConnectorProvider.JIRA,
        entityType: 'task',
        entityId: DEMO_IDS.activeIncidentTaskContainment,
        externalObjectId: 'SEC-208',
        externalObjectKey: 'SEC-208',
        externalObjectUrl: 'https://vantage-demo.atlassian.net/browse/SEC-208',
        lastSyncStatus: ConnectorActivityStatus.SUCCEEDED,
        lastSyncedAt: oneDayAgo,
        createdAt: oneDayAgo,
        updatedAt: oneDayAgo
      },
      {
        tenantId,
        connectorId: DEMO_IDS.connectorConfluence,
        provider: ConnectorProvider.CONFLUENCE,
        entityType: 'board_brief',
        entityId: DEMO_IDS.boardBrief,
        externalObjectId: '200100',
        externalObjectKey: 'Q1 board brief - cyber posture and buyer readiness',
        externalObjectUrl: 'https://vantage-demo.atlassian.net/wiki/spaces/SEC/pages/200100',
        lastSyncStatus: ConnectorActivityStatus.SUCCEEDED,
        lastSyncedAt: oneDayAgo,
        createdAt: oneDayAgo,
        updatedAt: oneDayAgo
      }
    ]
  });

  await prisma.connectorActivity.createMany({
    data: [
      {
        tenantId,
        connectorId: DEMO_IDS.connectorSlack,
        provider: ConnectorProvider.SLACK,
        action: 'notify',
        entityType: 'trust_room_request',
        entityId: DEMO_IDS.trustRoomRequestPending,
        targetLabel: 'Security Ops Slack',
        status: ConnectorActivityStatus.SUCCEEDED,
        summary: 'Buyer request notification delivered to Slack',
        payloadJson: { channel: '#security-ops', eventKey: 'trust_room_request_received' },
        createdBy: DEMO_USER_ID,
        createdAt: oneDayAgo
      },
      {
        tenantId,
        connectorId: DEMO_IDS.connectorJira,
        provider: ConnectorProvider.JIRA,
        action: 'sync',
        entityType: 'risk',
        entityId: DEMO_IDS.riskTrust,
        targetLabel: 'Delivery Jira Sync',
        externalObjectId: 'SEC-201',
        externalObjectKey: 'SEC-201',
        externalObjectUrl: 'https://vantage-demo.atlassian.net/browse/SEC-201',
        status: ConnectorActivityStatus.SUCCEEDED,
        summary: 'Synced buyer-safe data residency risk into Jira',
        payloadJson: { status: 'to-do' },
        createdBy: DEMO_USER_ID,
        createdAt: oneDayAgo
      },
      {
        tenantId,
        connectorId: DEMO_IDS.connectorConfluence,
        provider: ConnectorProvider.CONFLUENCE,
        action: 'publish',
        entityType: 'board_brief',
        entityId: DEMO_IDS.boardBrief,
        targetLabel: 'Leadership Confluence Publisher',
        externalObjectId: '200100',
        externalObjectKey: 'Q1 board brief - cyber posture and buyer readiness',
        externalObjectUrl: 'https://vantage-demo.atlassian.net/wiki/spaces/SEC/pages/200100',
        status: ConnectorActivityStatus.SUCCEEDED,
        summary: 'Published Q1 board brief into Confluence',
        payloadJson: { artifactType: 'board_brief' },
        createdBy: DEMO_USER_ID,
        createdAt: oneDayAgo
      },
      {
        tenantId,
        connectorId: DEMO_IDS.connectorWebhook,
        provider: ConnectorProvider.OUTBOUND_WEBHOOK,
        action: 'notify',
        entityType: 'incident',
        entityId: DEMO_IDS.activeIncident,
        targetLabel: 'Automation Hook',
        status: ConnectorActivityStatus.SUCCEEDED,
        summary: 'Pushed incident-created payload into downstream automation hook',
        payloadJson: { eventKey: 'incident_created' },
        createdBy: DEMO_USER_ID,
        createdAt: oneDayAgo
      }
    ]
  });

  await prisma.adoptionImport.createMany({
    data: [
      {
        id: DEMO_IDS.adoptionImportAnswers,
        tenantId,
        target: AdoptionImportTarget.APPROVED_ANSWERS,
        source: AdoptionImportSource.CONNECTOR_EXPORT,
        status: AdoptionImportStatus.SUCCEEDED,
        connectorId: DEMO_IDS.connectorJira,
        sourceLabel: 'Imported from prior diligence tracker export',
        summary: 'connector-assisted import created 2 approved answers.',
        rawInput: {
          content: 'questionText,answerText,scope',
          ownerUserId: DEMO_USERS[1].id
        },
        resultJson: {
          rows: [
            { index: 0, label: 'Do you maintain approved security policies?', entityId: DEMO_IDS.approvedPolicies, action: 'updated' },
            { index: 1, label: 'Is MFA enforced for privileged accounts?', entityId: DEMO_IDS.approvedMfa, action: 'updated' }
          ]
        },
        createdCount: 2,
        failedCount: 0,
        createdBy: DEMO_USER_ID,
        createdAt: twoDaysAgo
      },
      {
        id: DEMO_IDS.adoptionImportRisk,
        tenantId,
        target: AdoptionImportTarget.RISKS,
        source: AdoptionImportSource.CSV,
        status: AdoptionImportStatus.SUCCEEDED,
        sourceLabel: 'Leadership backlog import',
        summary: 'CSV import created 1 risk.',
        rawInput: {
          content: 'title,description,businessImpactSummary,severity,likelihood,impact,status',
          ownerUserId: DEMO_USERS[2].id
        },
        resultJson: {
          rows: [
            {
              index: 0,
              label: 'Buyer-safe residency commitments remain manual',
              entityId: DEMO_IDS.riskTrust,
              action: 'created'
            }
          ]
        },
        createdCount: 1,
        failedCount: 0,
        createdBy: DEMO_USER_ID,
        createdAt: oneDayAgo
      }
    ]
  });

  await prisma.auditLog.createMany({
    data: [
      { tenantId, actorUserId: DEMO_USER_ID, entityType: 'questionnaire_upload', entityId: DEMO_IDS.questionnaireUpload, action: 'seeded', metadata: { organizationName: 'Northbridge Payments', status: QuestionnaireUploadStatus.NEEDS_REVIEW }, createdAt: fiveDaysAgo },
      { tenantId, actorUserId: DEMO_USERS[1].id, entityType: 'trust_packet', entityId: DEMO_IDS.trustPacket, action: 'trust_packet_exported', metadata: { format: 'html', shareMode: TrustPacketShareMode.EXTERNAL_SHARE }, createdAt: twoDaysAgo },
      { tenantId, actorUserId: DEMO_USERS[1].id, entityType: 'trust_room', entityId: DEMO_IDS.trustRoom, action: 'publish', metadata: { accessMode: TrustRoomAccessMode.REQUEST_ACCESS, slug: 'northbridge-payments-room' }, createdAt: twoDaysAgo },
      { tenantId, actorUserId: DEMO_USERS[1].id, entityType: 'trust_room_request', entityId: DEMO_IDS.trustRoomRequestApproved, action: 'update', metadata: { status: TrustRoomAccessRequestStatus.FULFILLED }, createdAt: oneDayAgo },
      { tenantId, actorUserId: DEMO_USER_ID, entityType: 'pulse_snapshot', entityId: DEMO_IDS.pulseSnapshot, action: 'pulse_snapshot_published', metadata: { overallScore: 74, reportingPeriod: DEMO_REPORTING_PERIOD }, createdAt: oneDayAgo },
      { tenantId, actorUserId: DEMO_USER_ID, entityType: 'adoption_import', entityId: DEMO_IDS.adoptionImportAnswers, action: 'adoption_import_completed', metadata: { target: AdoptionImportTarget.APPROVED_ANSWERS, source: AdoptionImportSource.CONNECTOR_EXPORT, createdCount: 2 }, createdAt: twoDaysAgo },
      { tenantId, actorUserId: DEMO_USER_ID, entityType: 'adoption_import', entityId: DEMO_IDS.adoptionImportRisk, action: 'adoption_import_completed', metadata: { target: AdoptionImportTarget.RISKS, source: AdoptionImportSource.CSV, createdCount: 1 }, createdAt: oneDayAgo },
      { tenantId, actorUserId: DEMO_USERS[1].id, entityType: 'board_brief', entityId: DEMO_IDS.boardBrief, action: 'board_brief_exported', metadata: { format: 'html' }, createdAt: oneDayAgo },
      { tenantId, actorUserId: DEMO_USERS[1].id, entityType: 'ai_vendor_review', entityId: DEMO_IDS.aiVendorReview, action: 'decision_updated', metadata: { status: AIGovernanceStatus.APPROVED_WITH_CONDITIONS, linkedRiskId: DEMO_IDS.riskAi }, createdAt: twoDaysAgo },
      { tenantId, actorUserId: DEMO_USER_ID, entityType: 'ai_use_case', entityId: DEMO_IDS.aiUseCase, action: 'decision_updated', metadata: { status: AIGovernanceStatus.APPROVED_WITH_CONDITIONS, linkedRiskId: DEMO_IDS.riskAi }, createdAt: twoDaysAgo },
      { tenantId, actorUserId: DEMO_USERS[1].id, entityType: 'ai_use_case', entityId: DEMO_IDS.aiUseCaseReview, action: 'decision_updated', metadata: { status: AIGovernanceStatus.NEEDS_REVIEW, linkedRiskId: DEMO_IDS.riskAiReview }, createdAt: oneDayAgo },
      { tenantId, actorUserId: DEMO_USERS[2].id, entityType: 'incident', entityId: DEMO_IDS.activeIncident, action: 'incident_created', metadata: { incidentType: IncidentType.THIRD_PARTY_BREACH, severity: IncidentSeverity.HIGH }, createdAt: oneDayAgo },
      { tenantId, actorUserId: DEMO_USERS[1].id, entityType: 'tabletop_exercise', entityId: DEMO_IDS.tabletop, action: 'tabletop_completed', metadata: { linkedRiskId: DEMO_IDS.riskTabletop, linkedFindingId: DEMO_IDS.tabletopFinding }, createdAt: oneDayAgo },
      { tenantId, actorUserId: DEMO_USER_ID, entityType: 'after_action_report', entityId: DEMO_IDS.afterAction, action: 'after_action_exported', metadata: { format: 'html' }, createdAt: oneDayAgo }
    ]
  });
}
