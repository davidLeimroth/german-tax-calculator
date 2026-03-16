---

# German Tax Calculator (Brutto-Netto-Rechner)

## Overview

A beautiful, user-friendly German salary tax calculator built with Astro + React. Users enter their gross salary and parameters, and instantly see a breakdown of net pay including Lohnsteuer, Solidaritaetszuschlag, Krankenversicherung, Pflegeversicherung, Rentenversicherung, and Arbeitslosenversicherung. Visualized with interactive pie/bar charts and a detailed breakdown table. Deployed as a static site on GitHub Pages.

## Context

- Files involved: Fresh project, all new files
- Tech stack: Astro 5 (static site generator), React 18, TypeScript, TanStack Form, TanStack Table, Nivo Charts, DaisyUI (Tailwind CSS)
- Deployment: GitHub Pages (static output via `astro build`)
- Tax year: 2025/2026 German tax rates and social insurance thresholds

## Development Approach

- **Testing approach**: Regular (code first, then tests) using Vitest
- Complete each task fully before moving to the next
- Astro handles routing and static generation; React islands handle interactive calculator UI
- All tax logic lives in pure TypeScript functions for easy testing
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Project scaffolding and tooling setup

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tailwind.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.github/workflows/deploy.yml`, `src/pages/index.astro`, `src/layouts/Layout.astro`

- [x] Initialize Astro project with React integration (`@astrojs/react`)
- [x] Install dependencies: `@nivo/pie`, `@nivo/bar`, `@tanstack/react-form`, `@tanstack/react-table`, `daisyui`, `tailwindcss`, `vitest`, `@testing-library/react`
- [x] Configure Tailwind CSS with DaisyUI plugin and a clean theme (light/dark toggle)
- [x] Configure Astro for static output (`output: 'static'`) with `base` path for GitHub Pages
- [x] Create base Layout.astro with HTML head, meta tags, and DaisyUI theme
- [x] Create index.astro page with a placeholder React island
- [x] Set up GitHub Actions workflow for deploying to GitHub Pages on push to main
- [x] Write a smoke test that verifies the Astro config exports correctly
- [x] Run project test suite - must pass before task 2

### Task 2: German tax calculation engine

**Files:**
- Create: `src/lib/tax-engine.ts`, `src/lib/types.ts`, `src/lib/constants.ts`
- Create: `src/lib/__tests__/tax-engine.test.ts`

- [x] Define TypeScript types for calculator input (gross salary, tax class, church tax, state, children, health insurance type, etc.) and output (all deductions + net)
- [x] Define 2025/2026 constants: income tax brackets, solidarity surcharge threshold, social insurance rates and contribution ceilings (Beitragsbemessungsgrenzen)
- [x] Implement Lohnsteuer calculation using the German progressive tax formula (Einkommensteuer-Grundtabelle/Splittingtabelle based on tax class)
- [x] Implement Solidaritaetszuschlag (5.5% of Lohnsteuer, with Freigrenze)
- [x] Implement Kirchensteuer (8% or 9% of Lohnsteuer depending on state)
- [x] Implement Krankenversicherung (gesetzlich: 14.6% + average Zusatzbeitrag, split employer/employee; or privat: fixed amount)
- [x] Implement Pflegeversicherung (3.4% base rate, surcharges for childless over 23, discounts for multiple children)
- [x] Implement Rentenversicherung (18.6% split, up to Beitragsbemessungsgrenze West/Ost)
- [x] Implement Arbeitslosenversicherung (2.6% split, up to BBG)
- [x] Create a main `calculateNetSalary()` function that orchestrates all calculations and returns a full breakdown
- [x] Write comprehensive tests covering all tax classes, edge cases (mini-job threshold, BBG limits, Soli Freigrenze), and known reference values
- [x] Run project test suite - must pass before task 3

### Task 3: Calculator input form with TanStack Form

**Files:**
- Create: `src/components/TaxCalculator.tsx`, `src/components/InputForm.tsx`

- [ ] Build the main TaxCalculator React component (the Astro island entry point with `client:load`)
- [ ] Build InputForm using TanStack Form with fields: monthly/annual gross salary, tax class (I-VI), Bundesland, church membership (yes/no), children count, health insurance type (gesetzlich/privat), Zusatzbeitrag percentage
- [ ] Apply DaisyUI form components (input, select, toggle, range) for polished look
- [ ] Add smart defaults (Steuerklasse I, no church tax, gesetzlich, Bayern, 0 children)
- [ ] Add input validation (salary > 0, valid ranges for all fields)
- [ ] Wire form to tax engine: calculate on every change for instant results
- [ ] Add responsive layout: form on left/top, results on right/bottom
- [ ] Write tests for form rendering, default values, and validation behavior
- [ ] Run project test suite - must pass before task 4

### Task 4: Charts and visual breakdown with Nivo

**Files:**
- Create: `src/components/SalaryChart.tsx`, `src/components/BreakdownBar.tsx`

- [ ] Build a Nivo Pie chart component showing the proportional breakdown of gross salary (net pay, Lohnsteuer, Soli, Kirchensteuer, KV, PV, RV, AV)
- [ ] Use a clear color palette with DaisyUI theme colors, with labels and tooltips showing Euro amounts and percentages
- [ ] Build a Nivo Bar chart showing a stacked monthly bar (or comparison between gross and deductions)
- [ ] Make charts responsive and animated on data change
- [ ] Add a summary card above charts showing key numbers: Brutto, Netto, total Abzuege (with DaisyUI stat components)
- [ ] Write tests verifying chart components render with sample data and update on prop changes
- [ ] Run project test suite - must pass before task 5

### Task 5: Detailed breakdown table with TanStack Table

**Files:**
- Create: `src/components/BreakdownTable.tsx`

- [ ] Build a TanStack Table showing each deduction as a row: name, employee share, employer share, total, percentage of gross
- [ ] Include summary rows for total deductions and net salary
- [ ] Style with DaisyUI table component (striped, hover, compact)
- [ ] Add column sorting capability
- [ ] Make table responsive (horizontal scroll on mobile or card layout)
- [ ] Write tests for table rendering, correct data display, and sorting
- [ ] Run project test suite - must pass before task 6

### Task 6: Polish, theme, and responsive design

**Files:**
- Modify: `src/layouts/Layout.astro`, `src/components/TaxCalculator.tsx`, `src/pages/index.astro`

- [ ] Add dark/light theme toggle using DaisyUI themes (store preference in localStorage)
- [ ] Add a header with app title and brief description
- [ ] Add a footer with disclaimer (no legal advice, approximate calculations)
- [ ] Ensure full mobile responsiveness: stacked layout on small screens, side-by-side on desktop
- [ ] Add smooth transitions between theme changes and data updates
- [ ] Add SEO meta tags and Open Graph tags for sharing
- [ ] Write tests for theme toggle persistence and responsive layout breakpoints
- [ ] Run project test suite - must pass before task 7

### Task 7: Verify acceptance criteria

- [ ] Manual test: enter a gross salary of 50,000 EUR/year, Steuerklasse I, verify net salary is in a plausible range (~30,000-33,000 EUR)
- [ ] Manual test: switch between tax classes and verify chart updates instantly
- [ ] Manual test: verify mobile layout works on 375px width
- [ ] Manual test: verify dark/light theme toggle works
- [ ] Run full test suite with `npx vitest run`
- [ ] Run linter with `npx astro check`
- [ ] Build the site with `npx astro build` and verify static output works
- [ ] Verify GitHub Pages deployment workflow is correct

### Task 8: Update documentation

- [ ] Update README.md with project description, setup instructions, tech stack, and deployment info
- [ ] Move this plan to `docs/plans/completed/`
