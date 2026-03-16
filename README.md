# Steuerrechner - German Tax Calculator (Brutto-Netto-Rechner)

A German salary tax calculator that computes net pay from gross salary, showing a full breakdown of all taxes and social contributions. Built as a static site with interactive charts and tables.

## Features

- Instant calculation of net salary from gross salary (monthly or annual)
- Supports all 6 German tax classes (Steuerklasse I-VI)
- Full deduction breakdown: Lohnsteuer, Solidaritaetszuschlag, Kirchensteuer, Krankenversicherung, Pflegeversicherung, Rentenversicherung, Arbeitslosenversicherung
- Interactive pie and bar charts (Nivo) for visual salary breakdown
- Sortable detailed breakdown table (TanStack Table) with employee/employer shares
- Configurable parameters: Bundesland, church membership, children count, health insurance type (gesetzlich/privat), Zusatzbeitrag
- Dark/light theme toggle with localStorage persistence
- Fully responsive design (mobile and desktop)
- 2025 German tax rates and social insurance thresholds

## Tech Stack

- [Astro 6](https://astro.build/) - Static site generator
- [React 19](https://react.dev/) - Interactive UI components (Astro islands)
- [TypeScript](https://www.typescriptlang.org/) - Type-safe codebase
- [TanStack Form](https://tanstack.com/form) - Form state management
- [TanStack Table](https://tanstack.com/table) - Sortable data table
- [Nivo](https://nivo.rocks/) - Pie and bar chart visualizations
- [Tailwind CSS 4](https://tailwindcss.com/) + [DaisyUI 5](https://daisyui.com/) - Styling and UI components
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) - Unit and component tests

## Getting Started

### Prerequisites

- Node.js >= 22.12.0

### Installation

```sh
npm install
```

### Development

```sh
npm run dev
```

Opens the dev server at `http://localhost:4321`.

### Testing

```sh
npm test            # Run tests once
npm run test:watch  # Run tests in watch mode
```

### Type Checking

```sh
npx astro check
```

### Build

```sh
npm run build
```

Produces a static site in `./dist/`.

### Preview

```sh
npm run preview
```

Preview the production build locally.

## Deployment

The site is deployed to GitHub Pages via a GitHub Actions workflow. On every push to `main`, the workflow:

1. Installs dependencies
2. Runs the test suite
3. Builds the static site
4. Deploys to GitHub Pages

The site is served at the `/steuerrechner/` base path.

## Project Structure

```
src/
  components/       React components (calculator, form, charts, table, theme toggle)
  layouts/          Astro layout (HTML shell, meta tags)
  lib/              Tax calculation engine, types, and constants
    __tests__/      Tax engine unit tests
  pages/            Astro pages (index)
  test/             Component and integration tests
```

## Disclaimer

This calculator provides approximate results for informational purposes only. It does not constitute tax advice. Actual tax amounts may vary based on individual circumstances. Consult a tax professional for precise calculations.
