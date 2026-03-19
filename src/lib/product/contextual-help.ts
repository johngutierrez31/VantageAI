export type ContextualHelpSection = {
  title: string;
  items: string[];
};

export type ContextualHelpContent = {
  summary: string;
  sections: ContextualHelpSection[];
  note?: string;
};

function buildHelp(
  summary: string,
  useCases: string[],
  startHere: string[],
  outputs: string[],
  note?: string
): ContextualHelpContent {
  return {
    summary,
    sections: [
      { title: 'Use It When', items: useCases },
      { title: 'Start Here', items: startHere },
      { title: 'What Good Looks Like', items: outputs }
    ],
    note
  };
}

export const CONTEXTUAL_HELP = {
  commandCenter: buildHelp(
    'Use Command Center as the weekly operating surface for cross-module priorities, carry-over risk, and leadership-ready next actions.',
    [
      'You need to decide what to work first across TrustOps, Pulse, AI Governance, and Response Ops.',
      'Leadership wants a concise view of pressure, backlog, and posture without opening each module.',
      'You want the fastest drill-through path into the right workflow.'
    ],
    [
      'Use the Demo Path card first when you need the fastest walkthrough for the seeded workspace.',
      'Use Adoption Mode when the next conversation is about stack fit, migration friction, or imported work.',
      'Review the KPI cards first to identify overdue or high-pressure work.',
      'Use the operational layers to decide whether the work belongs in TrustOps, Pulse, AI Governance, or Response Ops.',
      'Open the 7-day weekly execution queue or a linked workflow to move from insight into action.'
    ],
    [
      'The top open work is obvious within one screen.',
      'Each metric leads into a real module workflow, not a dead-end dashboard.',
      'You can leave this page with a clear weekly plan.'
    ],
    'Use this page daily. Use Pulse, TrustOps, AI Governance, and Response Ops when you need to do the actual work behind the metric.'
  ),
  toolsHub: buildHelp(
    'Use Tools Hub when you know the outcome you want and need the shortest path to the right guided workflow.',
    [
      'You want to launch a workflow without navigating module by module.',
      'You are demoing the product and need a clear explanation of what each workflow produces.',
      'You want to understand which modules are included in the current plan.'
    ],
    [
      'Use the Demo Path card first when you need the shortest demo click path.',
      'Use Adoption Mode when you need to explain how Vantage works alongside the current stack.',
      'Scan the module cards first to understand what each paid module covers.',
      'Use the integrated workflow section to explain how work moves across the suite.',
      'Launch a guided workflow card when you are ready to produce a durable record.'
    ],
    [
      'Users can tell the difference between TrustOps, Pulse, AI Governance, and Response Ops immediately.',
      'Users can see how Vantage fits with their existing tools before a full rollout decision.',
      'Each launcher maps to a real durable workflow, not vague chat behavior.',
      'You can use this page as both an onboarding surface and a live demo menu.'
    ]
  ),
  adoptionMode: buildHelp(
    'Use Adoption Mode when a new operator or buyer needs to understand how Vantage sits above the current stack before committing to a broader rollout.',
    [
      'You need to reduce rip-and-replace anxiety and show a practical path into the suite.',
      'Findings, risks, approved answers, or incidents already exist elsewhere and need a durable home in Vantage.',
      'You want the cross-module value graph to be visible before adding more process change.'
    ],
    [
      'Start with the job to be done first, such as a questionnaire, board brief, AI review, or incident.',
      'Import only the highest-signal records that will improve the next operator workflow.',
      'Use connectors to keep Slack, Jira, and publishing in the loop while Vantage becomes the operating layer.'
    ],
    [
      'Operators can explain where Vantage fits in one screen.',
      'Imported records are tenant-scoped, durable, and auditable.',
      'The path from trust work to risk, roadmap, board reporting, and incident carry-over is obvious.'
    ],
    'Use this page for onboarding and stack-fit conversations. Move into the owning module when execution begins.'
  ),
  copilot: buildHelp(
    'Use Copilot as a workflow launcher and guided reasoning layer, not as a generic chat surface.',
    [
      'You need help deciding which workflow to open next.',
      'You want tenant-aware guidance before creating or reviewing a record.',
      'You want help framing trust, posture, AI, or incident work in operator language.'
    ],
    [
      'Ask for a specific outcome such as drafting answers, preparing a board brief, or starting incident triage.',
      'Ask where Vantage fits alongside the current stack when the right start path is still unclear.',
      'Use the suggested workflow launchers to jump into the underlying module.',
      'Review and approve outputs in the module that owns the record.'
    ],
    [
      'Copilot points you into the correct workflow quickly.',
      'Outputs stay tenant-scoped and lead to durable records.',
      'High-stakes work still goes through module review and approval gates.'
    ],
    'Best prompts name the job to be done, the source context, and the intended audience.'
  ),
  trustOps: buildHelp(
    'Use TrustOps to shorten buyer diligence cycles, package approved evidence, and turn trust pressure into reusable operating assets.',
    [
      'A buyer or customer needs questionnaire responses, security evidence, or a trust package.',
      'You want approved answers, evidence maps, and trust packets to be reusable across deals.',
      'You need reviewer assignment and buyer-safe export controls.'
    ],
    [
      'Open Trust Inbox for intake work, Questionnaires for row-level drafting, and Answer Library for reuse governance.',
      'Use Evidence Maps to validate support strength before a buyer sees the response.',
      'Assemble a Trust Packet only from approved and share-safe materials.'
    ],
    [
      'Questionnaire answers are reviewed, approved, and reusable.',
      'Weak support becomes findings or follow-up work instead of hidden risk.',
      'Buyers get a clean packet built from approved artifacts only.'
    ]
  ),
  trustInbox: buildHelp(
    'Use Trust Inbox to track external trust requests as durable work instead of leaving them in email or spreadsheets.',
    [
      'A prospect or customer sends a security diligence request.',
      'You need one place to coordinate questionnaires, evidence, reviewers, and delivery state.',
      'You want trust work tied back to packets, evidence maps, and exports.'
    ],
    [
      'Create or open the trust item and confirm the request scope.',
      'Link the questionnaire, build evidence support, and route work into review.',
      'Use the item as the anchor for packet assembly and final delivery.'
    ],
    [
      'Every request has an owner, status, and linked evidence workflow.',
      'Open questions, missing evidence, and review state are visible before delivery.',
      'You can explain what was sent and why from one record.'
    ]
  ),
  trustInboxDetail: buildHelp(
    'Use the trust intake detail page to drive one external diligence request from intake through delivery.',
    [
      'You need to see linked evidence, questionnaires, packet state, and delivery readiness in one record.',
      'A specific buyer request is blocked and you need to see why.',
      'You want to assemble or export a response from a specific trust request.'
    ],
    [
      'Review the intake summary and linked workflow objects first.',
      'Check review state, due dates, and packet readiness before sharing.',
      'Open the linked questionnaire or trust packet when you need deeper editing.'
    ],
    [
      'The request has a clear status, linked records, and next action.',
      'Missing evidence or rejected content is obvious before external sharing.',
      'The final packet or response pack is traceable back to this intake item.'
    ]
  ),
  questionnaires: buildHelp(
    'Use Questionnaires to import buyer question sets, generate cited drafts, route reviews, and export approved responses only.',
    [
      'A customer sent a CSV or JSON questionnaire that needs structured handling.',
      'You want row persistence, normalized questions, and approved-answer reuse.',
      'You need a repeatable buyer-response workflow instead of manual copy and paste.'
    ],
    [
      'Upload the file or paste inline content and record the buyer organization.',
      'Open the questionnaire detail page to map rows, draft answers, assign reviewers, and export.',
      'Use Trust Inbox when the questionnaire is part of a broader buyer-response request.'
    ],
    [
      'Rows are persisted with source order and reusable normalized text.',
      'Low-confidence drafts are routed to review instead of being exported automatically.',
      'Only approved answers make it into the response pack.'
    ]
  ),
  questionnaireDetail: buildHelp(
    'Use questionnaire detail as the row-level operating view for mapping, drafting, review, and export.',
    [
      'You need to see exactly which questions were mapped, drafted, approved, or rejected.',
      'You want to assign a reviewer and manage the SLA for one questionnaire.',
      'You need to generate an evidence map or promote approved answers into the library.'
    ],
    [
      'Start with auto-mapping so rows inherit the best available control context.',
      'Generate drafts, then review rows with low confidence or weak evidence support.',
      'Approve strong answers, reject weak ones with notes, and export only when the set is ready.'
    ],
    [
      'Each row has clear support, confidence, and decision history.',
      'Weak evidence produces follow-up findings or tasks rather than silent risk.',
      'Approved answers can be promoted into the reusable library.'
    ],
    'Use this page when quality matters. Use the list page when you only need intake or routing.'
  ),
  answerLibrary: buildHelp(
    'Use Answer Library to govern which approved buyer responses become durable, reusable TrustOps assets.',
    [
      'You want to stop rewriting common trust answers.',
      'You need to see which answers are reusable versus tenant-specific.',
      'You want answer reuse to be governed, searchable, and commercially valuable.'
    ],
    [
      'Search for common questions or recent approved answers first.',
      'Review scope, ownership, source questionnaire, and linked evidence before changing reuse state.',
      'Archive weak or outdated entries instead of letting them stay active.'
    ],
    [
      'Reusable answers stay clean, buyer-safe, and tied to real evidence.',
      'Usage counts and last-used dates show what is actually driving value.',
      'The library becomes the default input for future questionnaire drafting.'
    ]
  ),
  evidenceMapDetail: buildHelp(
    'Use the evidence map detail page to validate support strength before trust content is packaged or shared.',
    [
      'You need to show how buyer questions map to controls, evidence, owners, and next actions.',
      'You want to collapse duplicate question themes into a smaller support set.',
      'You need to approve or archive an evidence map as a durable trust record.'
    ],
    [
      'Review the support strength of each cluster and focus on weak or missing support first.',
      'Check owner and next-action fields to see whether the gap is operationally covered.',
      'Approve the map before relying on it in a trust packet.'
    ],
    [
      'Each cluster explains why the support is strong, weak, or missing.',
      'Gaps are visible and linked back to follow-up work.',
      'The map is safe to reference in packet assembly and buyer conversations.'
    ]
  ),
  trustReviewQueue: buildHelp(
    'Use the TrustOps review queue to assign reviewers, set due dates, and control response-quality SLAs.',
    [
      'Questionnaires, evidence maps, or trust packets are waiting on review.',
      'You need overdue visibility across trust work instead of checking each page.',
      'You want a single operator queue for buyer-facing review decisions.'
    ],
    [
      'Filter by status, reviewer, or overdue state.',
      'Assign the right reviewer and confirm the due date before the deadline becomes silent risk.',
      'Open the underlying work item when a decision requires row-level or artifact-level review.'
    ],
    [
      'Nothing buyer-facing leaves the system without the right review path.',
      'Overdue trust work is visible before it hurts a procurement cycle.',
      'Review notes and decisions remain auditable.'
    ]
  ),
  pulse: buildHelp(
    'Use Pulse to translate operational work into leadership-ready posture, risk, remediation, and recurring review cadence.',
    [
      'Leadership wants a posture summary tied to real work, not disconnected slides.',
      'You need a risk register, roadmap, and board brief sourced from current signals.',
      'You want a recurring monthly or quarterly operating rhythm.'
    ],
    [
      'Generate the scorecard first so the rest of the workflow has a measured baseline.',
      'Sync the risk register, then generate the roadmap, board brief, and quarterly review in that order.',
      'Use the latest snapshot as the anchor for executive conversation.'
    ],
    [
      'Scores are explainable and tied to live signals.',
      'Risks and roadmap items have owners and due dates.',
      'Executive reporting reads like an operating review, not a security dump.'
    ]
  ),
  riskRegister: buildHelp(
    'Use the risk register as the living business-facing list of security risks that matter now.',
    [
      'You want one place to review open risks across trust gaps, findings, AI decisions, and incident carry-over.',
      'You need ownership, severity, due dates, and source tracking for risk decisions.',
      'You want better board and quarterly review inputs.'
    ],
    [
      'Filter by open, overdue, owner, severity, or source module first.',
      'Open top risks and confirm each one has a clear owner and target date.',
      'Use roadmap generation when the risk list is clear enough to become an execution plan.'
    ],
    [
      'The highest-severity risks are visible and current.',
      'Each risk has a source, owner, and due-date expectation.',
      'Pulse reporting can explain how risks are changing over time.'
    ]
  ),
  roadmap: buildHelp(
    'Use the roadmap to turn current risk and backlog pressure into a 30/60/90 execution plan with owners and dates.',
    [
      'Leadership wants to know what happens next, not just what is wrong.',
      'You need a reviewed plan sourced from live risks, gaps, and overdue work.',
      'You want a practical bridge from posture into execution.'
    ],
    [
      'Review the generated items by horizon and current status first.',
      'Check that each item has an owner, due date, and clear rationale.',
      'Use board briefs and quarterly reviews once the roadmap reflects the current priorities.'
    ],
    [
      'The roadmap is small enough to execute and strong enough to explain to leadership.',
      'Each item ties back to current source pressure.',
      'Overdue plan work is visible and actionable.'
    ]
  ),
  snapshotDetail: buildHelp(
    'Use snapshot detail to explain the current posture score instead of treating the score as a black box.',
    [
      'Leadership wants to know why the score moved.',
      'You need the category-level breakdown and measured inputs behind the headline score.',
      'You want to validate that current risks and overdue work are reflected properly.'
    ],
    [
      'Read the overall summary first, then drill into category scores and deltas.',
      'Use linked risks, findings, and tasks to validate the measured inputs.',
      'Approve the snapshot before you rely on it in board or quarterly reporting.'
    ],
    [
      'The score is explainable, not cosmetic.',
      'You can tie posture changes back to real operational signals.',
      'The snapshot is safe to reuse in executive reporting.'
    ]
  ),
  boardBriefDetail: buildHelp(
    'Use board brief detail to finalize the executive narrative before anything is exported or shared upward.',
    [
      'You need a concise leadership summary built from the current scorecard, risks, and roadmap.',
      'A board or executive review needs decisions, not raw operational detail.',
      'You want approval-gated export for a durable reporting artifact.'
    ],
    [
      'Review the posture summary, top risks, overdue actions, and decisions needed.',
      'Tighten the narrative until it is concise enough for a leadership audience.',
      'Approve the brief before export so the shared version is controlled.'
    ],
    [
      'The brief separates measured facts from narrative context.',
      'Leadership can see risks, progress, and decisions in one artifact.',
      'The export is stable and safe for review.'
    ]
  ),
  quarterlyReviewDetail: buildHelp(
    'Use quarterly review detail to run a recurring leadership cadence instead of assembling review notes ad hoc.',
    [
      'You need one record that ties together the scorecard, roadmap, board brief, and decisions made.',
      'Leadership decisions and follow-up actions need a durable home.',
      'You want quarterly reviews to feed future risk, task, and roadmap work.'
    ],
    [
      'Confirm the linked snapshot, board brief, and roadmap are current.',
      'Capture attendees, decisions, notes, and follow-up actions during the meeting.',
      'Finalize the review only after decisions and actions are clear.'
    ],
    [
      'The quarterly review becomes the official record of the leadership discussion.',
      'Decisions are tied back to posture and risk, not scattered across notes.',
      'Follow-up actions can be traced into execution work.'
    ]
  ),
  aiGovernance: buildHelp(
    'Use AI Governance to register AI activity, evaluate approval conditions, and turn AI adoption into auditable operating decisions.',
    [
      'A team wants to adopt an AI workflow, tool, assistant, or vendor.',
      'You need a governed intake process for data classes, vendors, policies, and approvals.',
      'Leadership wants visibility into AI risk without losing operational detail.'
    ],
    [
      'Register the use case first, then run vendor intake if a third party is involved.',
      'Review the policy mapping and unmet conditions before changing approval state.',
      'Use the review queue when AI decisions start stacking up.'
    ],
    [
      'High-risk AI workflows are surfaced early, not after deployment.',
      'Approval conditions are explicit and auditable.',
      'Rejected or risky AI activity feeds findings and Pulse instead of living in isolation.'
    ]
  ),
  aiUseCases: buildHelp(
    'Use the AI use case registry as the durable inventory of AI workflows inside the business.',
    [
      'You need to know which teams are using AI and under what conditions.',
      'A new AI workflow needs data-class, policy, or owner review.',
      'You want an operationally useful registry instead of a spreadsheet.'
    ],
    [
      'Create the use case with the business owner, workflow type, vendor, and data classes.',
      'Check whether customer, regulated, secret, or internet-exposed data is involved.',
      'Route the record into review when blockers or high-risk conditions exist.'
    ],
    [
      'The registry is searchable, current, and tied to decisions.',
      'High-risk items are visible before approval.',
      'Use cases can be linked into findings, tasks, and Pulse risks.'
    ]
  ),
  aiUseCaseDetail: buildHelp(
    'Use the AI use case detail page to make the approval decision with the full operating context in view.',
    [
      'You need to review one proposed AI workflow in depth.',
      'A decision is blocked by policy requirements, vendor issues, or data-class concerns.',
      'You want to trace the AI record into findings, tasks, or risks.'
    ],
    [
      'Review the typed fields, policy mapping, and decision blockers first.',
      'Confirm whether human review, logging, approved vendors, or other conditions are required.',
      'Approve, conditionally approve, reject, or archive only after the conditions are explicit.'
    ],
    [
      'The decision state is defensible and auditable.',
      'Any conditional approval leaves follow-up work behind it.',
      'High-risk or rejected items are linked into the rest of the suite.'
    ]
  ),
  aiVendors: buildHelp(
    'Use vendor intake to evaluate AI vendors as operational dependencies, not just procurement checkboxes.',
    [
      'A team wants to use an AI-enabled vendor or model provider.',
      'You need retention, training, subprocessor, logging, and DPA facts captured in one record.',
      'You want vendor review to feed the use-case approval path.'
    ],
    [
      'Capture the vendor, product, deployment, and data handling details first.',
      'Link the intake to one or more AI use cases so review context stays connected.',
      'Set reviewer and due date when the intake needs a formal decision.'
    ],
    [
      'Vendors are reviewed in a consistent typed workflow.',
      'Unknown retention or training behavior becomes visible risk, not hidden ambiguity.',
      'Approval conditions are reusable across future reviews.'
    ]
  ),
  aiVendorDetail: buildHelp(
    'Use the AI vendor detail page to complete one third-party AI review without losing the policy and risk context.',
    [
      'A specific vendor review needs a decision or follow-up conditions.',
      'You need to confirm training behavior, logging support, subprocessors, or data handling details.',
      'The linked AI use case is blocked on vendor facts.'
    ],
    [
      'Review the vendor facts, linked use cases, and policy mapping first.',
      'Confirm whether missing data should block approval or create conditions.',
      'Use the final decision to drive tasks, findings, or risks when needed.'
    ],
    [
      'The vendor review ends with a clear decision state.',
      'Conditional approvals create follow-up work instead of vague caveats.',
      'The record is usable later during audits or leadership review.'
    ]
  ),
  aiReviewQueue: buildHelp(
    'Use the AI review queue to manage reviewer assignment, due dates, and overdue AI decisions across both use cases and vendors.',
    [
      'AI approvals are starting to pile up.',
      'You need overdue visibility and queue operations for AI governance work.',
      'You want a single operator surface for AI decision routing.'
    ],
    [
      'Filter by status, reviewer, risk tier, or due state.',
      'Assign the right reviewer and tighten due dates for high-risk items.',
      'Open the underlying use case or vendor record when a decision needs deeper review.'
    ],
    [
      'No AI decision gets lost in email or Slack.',
      'High-risk items surface first.',
      'The queue shows where governance pressure is accumulating.'
    ]
  ),
  responseOps: buildHelp(
    'Use Response Ops to move from incident recognition into owned actions, decision logs, review artifacts, and follow-up carry-over.',
    [
      'An incident needs first-hour triage and structured execution.',
      'You want durable incident records, task packs, and after-action output.',
      'You need lightweight tabletop capability without a separate platform.'
    ],
    [
      'Start with the triage workflow when the incident is live or needs simulation.',
      'Launch the incident-linked runbook pack and assign owners immediately.',
      'Use after-action and tabletop records to push follow-up work into findings, risks, and Pulse.'
    ],
    [
      'Incidents have a clear owner, timeline, and next update expectation.',
      'Runbook tasks are tied to the incident instead of living elsewhere.',
      'Response work produces lessons learned and downstream follow-up.'
    ]
  ),
  incidentDetail: buildHelp(
    'Use incident detail as the system of record for one incident from declaration through post-incident review.',
    [
      'You need the current status, timeline, tasks, linked findings, and reports in one place.',
      'Leadership or responders need a single source of truth during the incident.',
      'You want to capture decisions without losing auditability.'
    ],
    [
      'Review status, severity, owners, and next update due first.',
      'Use the timeline to log key events and decisions as they happen.',
      'Generate or review the after-action report once the incident moves into recovery or closure.'
    ],
    [
      'The incident record explains what happened and what changed.',
      'Linked tasks, findings, and risks are visible from the same page.',
      'After-action work is reviewable before export.'
    ]
  ),
  tabletopDetail: buildHelp(
    'Use tabletop detail to run a lightweight exercise and convert lessons learned into owned follow-up.',
    [
      'You want to rehearse a scenario before it becomes a live incident.',
      'You need one record for participants, decisions, gaps, and follow-up actions.',
      'You want exercises to feed findings and risks, not just meeting notes.'
    ],
    [
      'Review the scenario, participants, and exercise objectives before the session starts.',
      'Capture decisions, gaps, and follow-up items during the exercise.',
      'Complete the exercise only after the resulting work is visible and assigned.'
    ],
    [
      'Exercises create real operational learning.',
      'Gap capture is concrete enough to become tasks, findings, or risks.',
      'Future quarterly reviews can reference the completed exercise.'
    ]
  ),
  findings: buildHelp(
    'Use Findings Workbench as the shared problem register across TrustOps, Pulse, AI Governance, and Response Ops.',
    [
      'You need to see what security gaps are still unresolved across the suite.',
      'A module created follow-up work that should be tracked centrally.',
      'You want a single backlog of problems rather than disconnected module views.'
    ],
    [
      'Review findings by source and priority first.',
      'Use the linked questionnaire, AI record, incident, tabletop, or task context to understand origin.',
      'Convert open work into assigned remediation with dates and ownership.'
    ],
    [
      'Cross-module issues are visible in one place.',
      'Each finding points back to a real source-of-truth record.',
      'Nothing important disappears after a workflow is completed.'
    ]
  ),
  evidence: buildHelp(
    'Use Evidence to keep reusable support artifacts available for TrustOps, assessments, and governance workflows.',
    [
      'You need artifacts that back claims in questionnaires, packets, or policy mapping.',
      'An operator needs a current document or artifact tied to a durable record.',
      'You want fewer one-off uploads and better evidence reuse.'
    ],
    [
      'Review what evidence already exists before creating new artifacts.',
      'Use the newest approved artifact when linking into trust or governance workflows.',
      'Replace stale artifacts rather than creating near-duplicates.'
    ],
    [
      'Evidence is reusable, current, and easy to reference.',
      'TrustOps and governance workflows can cite real support.',
      'Operators know which artifacts are safe to rely on.'
    ]
  ),
  assessments: buildHelp(
    'Use Assessments to run structured readiness reviews and convert weak areas into execution work.',
    [
      'You want a scored readiness view tied to controls and questions.',
      'You need a repeatable assessment workflow before building reports.',
      'You want assessment gaps to feed findings, tasks, and Pulse.'
    ],
    [
      'Review the current assessment list to find active or recent work.',
      'Open a detail view when the assessment needs responses, scoring, or reporting.',
      'Use the new assessment flow when you need a fresh readiness review.'
    ],
    [
      'Assessments produce usable scores and gaps, not just completed forms.',
      'Weak responses lead to follow-up work.',
      'Reports can be reused in executive and operational workflows.'
    ]
  ),
  assessmentNew: buildHelp(
    'Use the new assessment page to create a fresh readiness review with the right template and scope from the start.',
    [
      'You are starting a new internal assessment or customer-readiness review.',
      'You need a clear operator entry point instead of building records manually.',
      'You want future reporting and gap conversion to work cleanly.'
    ],
    [
      'Pick the template and assessment name carefully so reporting stays readable later.',
      'Confirm the purpose of the review before creating the record.',
      'Move into the assessment workspace immediately after creation to start answering.'
    ],
    [
      'The assessment begins with a clear scope and title.',
      'Templates align to the review you actually need to run.',
      'The resulting record is ready for scoring and reporting.'
    ]
  ),
  assessmentDetail: buildHelp(
    'Use assessment detail to answer questions, review scoring, and turn weak controls into follow-up work.',
    [
      'You need the working view for a specific assessment.',
      'You want to understand how the score is changing as responses are added.',
      'You need to export or report on one assessment.'
    ],
    [
      'Work through unanswered or low-confidence questions first.',
      'Review score impact and control-level gaps before finalizing the assessment.',
      'Generate the report when the assessment is complete enough for review.'
    ],
    [
      'The assessment tells you where the real weaknesses are.',
      'Scores are tied to responses, not just a summary number.',
      'Reports and follow-up actions are easy to generate from the finished record.'
    ]
  ),
  policies: buildHelp(
    'Use Policies to generate formal policy artifacts that support trust, governance, and operating maturity.',
    [
      'You need a policy document for a security, AI, or operational workflow.',
      'A customer or reviewer needs a formal policy artifact.',
      'You want to standardize documentation instead of drafting from scratch.'
    ],
    [
      'Choose the right policy template and framework alignment first.',
      'Generate the draft, then edit and export in the format needed for review or sharing.',
      'Use policy outputs to support TrustOps or AI Governance workflows when relevant.'
    ],
    [
      'Policies are consistent, reviewable, and reusable.',
      'Generated artifacts are good enough to support real buyer or governance requests.',
      'Operators can move from policy need to artifact quickly.'
    ]
  ),
  runbooks: buildHelp(
    'Use Runbooks for reusable execution packs that support both incident work and repeat operational tasks.',
    [
      'You need a prebuilt task pack for an incident or recurring workflow.',
      'Response Ops requires a fast operational starting point.',
      'You want repeatable execution instead of rebuilding task lists each time.'
    ],
    [
      'Open a runbook to confirm the phases and tasks it covers.',
      'Use the task-pack actions when you need to launch work into an incident or other workflow.',
      'Review task ownership and due-date expectations immediately after launch.'
    ],
    [
      'Runbooks reduce startup time during real work.',
      'Task packs are consistent and traceable.',
      'Operators spend less time deciding what the checklist should be.'
    ]
  ),
  securityAnalyst: buildHelp(
    'Use Security Analyst for structured security analysis that feeds the rest of the suite instead of staying as a one-off note.',
    [
      'You need a concise security analysis for threats, incidents, architecture, or posture issues.',
      'An operator wants a guided analysis workflow rather than a blank page.',
      'You need an artifact that can inform findings, policy, or executive conversation.'
    ],
    [
      'Define the scenario or input clearly before generation.',
      'Use the analysis to clarify threats, impacts, and recommendations.',
      'Turn important outputs into durable tasks, findings, or reports.'
    ],
    [
      'The analysis is operationally useful, not just descriptive.',
      'Recommendations can be linked into existing workflows.',
      'The output helps an operator act faster.'
    ]
  ),
  cyberRange: buildHelp(
    'Use Cyber Range when you need a structured exercise or simulation design artifact rather than an ad hoc scenario note.',
    [
      'You want to design a realistic security exercise environment or scenario plan.',
      'A tabletop or readiness exercise needs more structure.',
      'You need a durable planning artifact for training or simulation work.'
    ],
    [
      'Define the scenario type and intended learning outcome first.',
      'Use the generation workflow to create the range or exercise plan.',
      'Review the output before exporting or using it with stakeholders.'
    ],
    [
      'The output is specific enough to run an exercise.',
      'Design decisions and assumptions are explicit.',
      'The artifact is reusable for future readiness work.'
    ]
  ),
  reports: buildHelp(
    'Use Reports as the export and reporting library for assessment-driven artifacts and reusable outputs.',
    [
      'You need to reopen or export a prior report.',
      'An assessment already generated the report and you want the durable record.',
      'You want to show reporting history over time.'
    ],
    [
      'Find the report by title, assessment, or recency.',
      'Open the linked assessment if the report needs to be regenerated or updated.',
      'Use the report list as the historical archive, not as the working screen for new assessments.'
    ],
    [
      'Reports are easy to find and tied back to their source assessment.',
      'Operators can distinguish current versus historical reporting quickly.',
      'Exports stay consistent with the rest of the suite.'
    ]
  ),
  billing: buildHelp(
    'Use Billing and Packaging to understand plan coverage, module access, and the commercial shape of the suite.',
    [
      'You need to explain which modules are included in the current plan.',
      'A demo or customer conversation requires a packaging view.',
      'You want to see which higher-value workflows are gated by plan.'
    ],
    [
      'Review the current plan and included modules first.',
      'Use the module packaging details to explain upgrade paths or attach opportunities.',
      'Return to Tools Hub or Command Center to open the workflow once access is clear.'
    ],
    [
      'Operators understand what is included today versus premium.',
      'The product supports upsell conversations without forcing billing complexity into the workflow.',
      'Module value is visible from inside the app.'
    ]
  ),
  members: buildHelp(
    'Use Members to confirm who can participate in review, approval, and operational workflows across the suite.',
    [
      'You need to know who can own work, review items, or receive assignments.',
      'Reviewer queues are blocked because ownership is unclear.',
      'You are setting up the tenant for operational use.'
    ],
    [
      'Confirm the right people are present and identifiable in the workspace.',
      'Use this page when reviewer or owner selection is missing or outdated elsewhere in the app.',
      'Return to the relevant module once the people and roles are correct.'
    ],
    [
      'Review assignments resolve cleanly across TrustOps, AI Governance, Pulse, and Response Ops.',
      'Operators can select real owners and reviewers from current members.',
      'The workspace is ready for collaborative workflows.'
    ]
  ),
  overview: buildHelp(
    'Use the overview page as a lightweight orientation surface when you need a high-level product summary instead of module execution.',
    [
      'A user is new to the suite and needs the broad shape before doing work.',
      'You want a simple orientation point during a demo.',
      'You need a quick product-level explanation without opening each module.'
    ],
    [
      'Use this page first only when the user does not yet understand the suite layout.',
      'Move into Command Center or Tools Hub once orientation is complete.',
      'Treat this as a starting map, not the day-to-day operating surface.'
    ],
    [
      'Users leave knowing where to start next.',
      'The suite structure is clear in a few minutes.',
      'The page does not replace the operational modules.'
    ]
  ),
  templates: buildHelp(
    'Use Templates to manage reusable assessment structures that feed repeatable readiness and reporting workflows.',
    [
      'You need a reusable framework for future assessments.',
      'You want assessment creation to start from governed templates rather than ad hoc question sets.',
      'You are refining the assessment program itself, not running one assessment.'
    ],
    [
      'Review the existing templates first to avoid near-duplicates.',
      'Create or update a template only when it improves repeatable assessments.',
      'Use assessments for execution after the template is ready.'
    ],
    [
      'Templates stay reusable and clearly named.',
      'New assessments start faster because the structure is already governed.',
      'The program stays cleaner over time.'
    ]
  )
} as const;

export type ContextualHelpKey = keyof typeof CONTEXTUAL_HELP;

export function getContextualHelp(key: ContextualHelpKey): ContextualHelpContent {
  return CONTEXTUAL_HELP[key];
}
