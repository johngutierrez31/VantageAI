# Codex Skills Setup

This repository uses repo-local Vantage workflow skills plus a small set of external Codex skills that help with Next.js quality, UX, copy, audits, and testing.

## Recommended install commands

Run these from a terminal with network access:

```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
npx skills add https://github.com/vercel-labs/next-skills --skill next-best-practices
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
npx skills add https://github.com/mrgoonie/claudekit-skills --skill ui-styling
npx skills add https://github.com/coreyhaines31/marketingskills --skill copywriting
npx skills add https://github.com/squirrelscan/skills --skill audit-website
npx skills add https://github.com/7spade/black-tortoise --skill webapp-testing
```

## Purpose by skill

- `find-skills`: discover installable skills during new workflow design
- `next-best-practices`: keep Next.js routing, server components, and production behavior sharp
- `vercel-react-best-practices`: improve React component structure and rendering discipline
- `ui-styling`: tighten operator-facing UX and visual polish
- `copywriting`: help shape commercial UI copy and workflow messaging
- `audit-website`: review product surfaces for quality and external presentation gaps
- `webapp-testing`: strengthen browser-driven app validation flows

## Current environment note

The following skills were installed successfully in this environment:

- `find-skills`
- `next-best-practices`
- `vercel-react-best-practices`
- `ui-styling`
- `copywriting`
- `audit-website`

`webapp-testing` could not be installed from `https://github.com/7spade/black-tortoise` because the repository clone required authentication in this environment. If access is granted later, rerun the command above.

## Repo-local Vantage skills

TrustOps and adjacent workflows are implemented as repo-local skills under [`.agents/skills`](C:\Users\JohnC\Documents\Playground\VantageAI\.agents\skills):

- `vantage-questionnaire-responder`
- `vantage-evidence-map-builder`
- `vantage-trust-packet-builder`
- `vantage-board-brief-generator`
- `vantage-ai-use-case-review`
