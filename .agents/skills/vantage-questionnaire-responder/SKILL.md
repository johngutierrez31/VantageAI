---
name: vantage-questionnaire-responder
description: Draft buyer security questionnaire answers from approved tenant evidence, mapped controls, and approved answer library content. Use when a workflow involves uploaded questionnaires, trust inbox responses, question normalization, evidence-backed answer drafting, confidence scoring, or review routing for procurement diligence.
---

# Vantage Questionnaire Responder

## Workflow

1. Normalize the incoming question text.
2. Reuse mapped tenant questions and control context when available.
3. Prefer approved tenant answers before generating new language.
4. Pull only tenant-approved evidence and cite it when support exists.
5. Score confidence from mapping strength, answer-library reuse, and evidence strength.
6. Force review if confidence is below `0.85`, evidence is weak or missing, or the answer implies a sensitive commitment.
7. Persist the draft, review state, citations, and audit history.

## Required behavior

- Never invent facts.
- Never claim a control or artifact exists when it does not.
- Separate strong support from weak or missing support.
- Prefer the smallest sufficient support set.
- Use practical buyer-safe language.
- Treat timing promises, guarantees, encryption claims, data residency claims, and compliance commitments as sensitive.

## Structured output

- `question_id`
- `normalized_question`
- `mapped_control_ids`
- `supporting_evidence_ids`
- `draft_answer`
- `confidence_score`
- `review_required`
- `review_reason`
- `notes_for_reviewer`

## Product mapping

- Persist outputs as questionnaire draft records.
- Save citations, confidence, control links, evidence links, and reviewer notes.
- Route low-confidence outputs into the questionnaire review queue.
- Write audit history for generation and review actions.
