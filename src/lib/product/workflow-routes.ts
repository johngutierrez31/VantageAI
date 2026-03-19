type QueryValue = string | null | undefined;

function buildWorkflowHref(
  pathname: string,
  options?: {
    hash?: string;
    query?: Record<string, QueryValue>;
  }
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(options?.query ?? {})) {
    if (!value) continue;
    params.set(key, value);
  }

  const queryString = params.toString();
  const hash = options?.hash ? `#${options.hash}` : '';
  return `${pathname}${queryString ? `?${queryString}` : ''}${hash}`;
}

export const workflowRoutes = {
  pulseScorecard() {
    return buildWorkflowHref('/app/pulse', {
      query: { workflow: 'scorecard' },
      hash: 'pulse-scorecard-workflow'
    });
  },
  pulseRoadmap() {
    return buildWorkflowHref('/app/pulse', {
      query: { workflow: 'roadmap' },
      hash: 'pulse-roadmap-workflow'
    });
  },
  pulseRoadmapRecord(roadmapId?: string | null) {
    return buildWorkflowHref('/app/pulse/roadmap', {
      query: { roadmapId },
      hash: roadmapId ? `roadmap-${roadmapId}` : undefined
    });
  },
  pulseBoardBrief() {
    return buildWorkflowHref('/app/pulse', {
      query: { workflow: 'board-brief' },
      hash: 'pulse-board-brief-workflow'
    });
  },
  pulseQuarterlyReview() {
    return buildWorkflowHref('/app/pulse', {
      query: { workflow: 'quarterly-review' },
      hash: 'pulse-quarterly-review-workflow'
    });
  },
  aiUseCaseCreate(workflow: 'create' | 'policy-mapping' = 'create') {
    return buildWorkflowHref('/app/ai-governance/use-cases', {
      query: { workflow },
      hash: 'ai-use-case-form'
    });
  },
  aiVendorIntakeCreate() {
    return buildWorkflowHref('/app/ai-governance/vendors', {
      query: { workflow: 'create' },
      hash: 'ai-vendor-intake-form'
    });
  },
  aiReviewQueue() {
    return '/app/ai-governance/reviews';
  },
  responseIncidentTriage(runbookId?: string | null) {
    return buildWorkflowHref('/app/response-ops', {
      query: { workflow: 'incident-triage', runbookId },
      hash: 'incident-triage-workflow'
    });
  },
  responseRunbookPack() {
    return buildWorkflowHref('/app/response-ops', {
      query: { workflow: 'runbook-pack' },
      hash: 'open-incidents'
    });
  },
  responseIncidentTimeline() {
    return buildWorkflowHref('/app/response-ops', {
      query: { workflow: 'timeline' },
      hash: 'open-incidents'
    });
  },
  responseAfterAction() {
    return buildWorkflowHref('/app/response-ops', {
      query: { workflow: 'after-action' },
      hash: 'after-action-workflow'
    });
  },
  responseTabletop() {
    return buildWorkflowHref('/app/response-ops', {
      query: { workflow: 'tabletop' },
      hash: 'tabletop-workflow'
    });
  },
  trustPacketAssembly(packetId?: string | null) {
    return buildWorkflowHref('/app/trust', {
      query: { workflow: 'packet-assembly', packetId },
      hash: 'trust-packet-assembly'
    });
  },
  trustRoomPublish(packetId?: string | null) {
    return buildWorkflowHref('/app/trust/rooms', {
      query: { workflow: 'publish', packetId },
      hash: 'publish-trust-room'
    });
  },
  trustRoomAccessRequests() {
    return buildWorkflowHref('/app/trust/rooms', {
      query: { workflow: 'access-requests' },
      hash: 'trust-room-requests'
    });
  },
  trustRoomEngagement() {
    return buildWorkflowHref('/app/trust/rooms', {
      query: { workflow: 'engagement' },
      hash: 'trust-room-engagement'
    });
  },
  questionnairesIntake() {
    return buildWorkflowHref('/app/questionnaires', {
      query: { workflow: 'intake' },
      hash: 'start-questionnaire-intake'
    });
  },
  questionnairesReviewEntry() {
    return buildWorkflowHref('/app/questionnaires', {
      query: { workflow: 'review' },
      hash: 'recent-questionnaire-uploads'
    });
  },
  questionnairesEvidenceMapEntry() {
    return buildWorkflowHref('/app/questionnaires', {
      query: { workflow: 'evidence-map' },
      hash: 'recent-questionnaire-uploads'
    });
  },
  questionnaireReview(questionnaireId: string) {
    return buildWorkflowHref(`/app/questionnaires/${questionnaireId}`, {
      query: { workflow: 'review' },
      hash: 'questionnaire-review-queue'
    });
  },
  questionnaireEvidenceMap(questionnaireId: string) {
    return buildWorkflowHref(`/app/questionnaires/${questionnaireId}`, {
      query: { workflow: 'evidence-map' },
      hash: 'questionnaire-guided-actions'
    });
  },
  runbookLauncher(runbookId?: string | null, incidentId?: string | null) {
    return buildWorkflowHref('/app/runbooks', {
      query: { workflow: runbookId ?? 'launch-pack', incidentId },
      hash: 'runbook-launcher'
    });
  },
  policiesGenerator() {
    return buildWorkflowHref('/app/policies', { hash: 'policy-generator-form' });
  }
};
