# VantageCISO UI Guidelines

This document defines the `/app` design system and layout patterns introduced in the MVP+ platform refresh.

## 1. Design Tokens

Source of truth:

- `src/styles/theme.ts`
- `src/app/globals.css`
- `tailwind.config.js`

Use semantic tokens (`background`, `card`, `muted`, `border`, `primary`, `success`, `warning`, `danger`) instead of hard-coded hex values in components.

## 2. App Shell Pattern

Use `src/components/app/app-shell.tsx` for all `/app/*` routes.

Required shell elements:

- Left navigation with product IA
- Workspace switcher (tenant selector)
- Topbar search trigger (`Cmd+K / Ctrl+K`)
- Notifications menu
- User menu (role + session actions)

All app pages should render inside this shell via `src/app/app/layout.tsx`.

## 3. Shared Building Blocks

Use these shared components before creating custom one-off UI:

- `PageHeader`: page title, description, primary CTA, secondary actions
- `KpiCard`: scorecards and key metrics
- `StatusPill`: normalized status display
- `EmptyState`: consistent empty and no-results screens
- `DataTable`: section wrapper for table/list surfaces
- `Sparkline`: compact trend visualization

Base primitives (shadcn-style):

- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/badge.tsx`

## 4. Page Composition Rules

For every major `/app` page:

1. Start with `PageHeader`.
2. Show top-level KPIs or summary cards.
3. Place operational tables/lists below KPIs.
4. Include explicit empty states for no-data paths.
5. Keep actions near the data they affect.

## 5. Workflow UX Standards

### Assessments

- Assessment detail uses tabs: `Summary`, `Controls`, `Evidence`, `Report`.
- Controls table must expose maturity, coverage, evidence tier, and task conversion actions.

### Gaps to Work

- Tasks must include assignee, due date, priority, and status.
- Use consistent status values: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`.

### Exception Governance

- Accepted risk requires reason, approver, and expiry date.
- Show expiring exceptions in overview and notifications.

### Evidence

- Display freshness (stale > 90 days).
- Show linkage counts to controls/responses.

## 6. Search and Navigation

- Global search is opened by button or keyboard shortcut (`Cmd/Ctrl + K`).
- Search indexes templates, assessments, and controls.
- Mobile navigation must expose all primary sections (do not rely on desktop sidebar only).

## 7. Loading, Empty, and Error States

- Use `/app/loading.tsx` skeletons for app-wide route transitions.
- Use `EmptyState` for initial/no-match/no-record screens.
- Error copy should be action-oriented and include next step when possible.

## 8. Accessibility and Content

- Maintain visible focus styles on interactive controls.
- Use sentence case labels and concise helper text.
- Keep terminology consistent:
  - "Assessment"
  - "Template"
  - "Evidence"
  - "Finding / Gap"
  - "Exception"

## 9. Extending the UI

When adding a new page under `/app`:

1. Add nav item in `app-shell.tsx` if it is top-level.
2. Use `PageHeader` + at least one shared section component.
3. Add status and empty states.
4. Confirm responsive behavior on mobile and desktop.
5. Add route-level test coverage where logic is non-trivial.

