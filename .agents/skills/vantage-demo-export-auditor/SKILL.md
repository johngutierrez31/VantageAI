---
name: vantage-demo-export-auditor
description: Audit the seeded demo exports for naming, consistency, share safety, and story readiness across the confirmed local modules. Use when validating trust packet, board brief, after-action, or report export polish for demos.
---

# Vantage Demo Export Auditor

## Trigger conditions

- Demo export polish
- Seeded artifact audit
- Share-safe export review
- Export naming consistency check

## Required behavior

1. Audit only export flows that are supported locally.
2. Confirm seeded artifacts use consistent names and believable titles.
3. Preserve internal-review versus external-share separation.
4. Confirm review-gated exports remain gated.
5. Prefer lightweight consistency improvements over building new packaging types.
6. Do not claim PDF, zip, trust-center, or board-book support unless it already exists locally.

## Structured output

- `audited_exports`
- `naming_findings`
- `share_safety_findings`
- `seed_readiness`
- `recommended_fixes`

## Product mapping

- Focus on Trust Packet, Board Brief, After-Action, and existing report exports.
- Reuse existing export naming helpers, review states, and export-count patterns.
- Keep demo exports aligned with current tenant branding and seeded workflow records.
