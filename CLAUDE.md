# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Black Estate** — a Next.js 16 web application using React 19, TypeScript 5, and Tailwind CSS 4. Uses the App Router architecture. Currently a fresh scaffold with no custom features yet.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test framework is configured yet.

## Architecture

- **Next.js App Router** with file-based routing in `app/`
- **Server Components by default** — add `"use client"` directive for client components
- **Tailwind CSS 4** via `@tailwindcss/postcss` plugin (configured in `postcss.config.mjs`)
- **Path alias:** `@/*` maps to the project root (e.g., `import Foo from "@/app/components/Foo"`)
- **Fonts:** Geist Sans and Geist Mono loaded via `next/font` with CSS variables
- **Dark mode:** CSS custom properties with `prefers-color-scheme` media queries in `app/globals.css`

## Configuration

- `next.config.ts` — Next.js config (currently empty)
- `eslint.config.mjs` — ESLint 9+ flat config extending `core-web-vitals` and `typescript`
- `tsconfig.json` — Strict mode enabled, target ES2017, bundler module resolution
