---
name: nx-import
description: Import, merge, or combine repositories into an Nx workspace using nx import. USE WHEN the user asks to adopt Nx across repos, move projects into a monorepo, or bring code/history from another repository.
---

## Quick Start

- `nx import` brings code from a source repository or folder into the current workspace, preserving commit history.
- After nx `22.6.0`, `nx import` responds with .ndjson outputs and follow-up questions. For earlier versions, always run with `--no-interactive` and specify all flags directly.
- Run `nx import --help` for available options.
- Make sure the destination directory is empty before importing.
  EXAMPLE: target has `libs/utils` and `libs/models`; source has `libs/ui` and `libs/data-access` — you cannot import `libs/` into `libs/` directly. Import each source library individually.

Primary docs:

- https://nx.dev/docs/guides/adopting-nx/import-project
- https://nx.dev/docs/guides/adopting-nx/preserving-git-histories

Read the nx docs if you have the tools for it.

## Import Strategy

**Subdirectory-at-a-time** (`nx import <source> apps --source=apps`):

- **Recommended for monorepo sources** — files land at top level, no redundant config
- Caveats: multiple import commands (separate merge commits each); dest must not have conflicting directories; root configs (deps, plugins, targetDefaults) not imported
- **Directory conflicts**: Import into alternate-named dir (e.g. `imported-apps/`), then rename

**Whole repo** (`nx import <source> imported --source=.`):

- **Only for non-monorepo sources** (single-project repos)
- For monorepos, creates messy nested config (`imported/nx.json`, `imported/tsconfig.base.json`, etc.)
- If you must: keep imported `tsconfig.base.json` (projects extend it), prefix workspace globs and executor paths

### Directory Conventions

- **Always prefer the destination's existing conventions.** Source uses `libs/`but dest uses `packages/`? Import into `packages/` (`nx import <source> packages/foo --source=libs/foo`).
- If dest has no convention (empty workspace), ask the user.

### Application vs Library Detection

Before importing, identify whether the source is an **application** or a **library**:

- **Applications**: Deployable end products. Common indicators:
  - _Frontend_: `next.config.*`, `vite.config.*` with a build entry point, framework-specific app scaffolding (CRA, Angular CLI app, etc.)
  - _Backend (Node.js)_: Express/Fastify/NestJS server entrypoint, no `"exports"` field in `package.json`
  - _JVM_: Maven `pom.xml` with `<packaging>jar</packaging>` or `<packaging>war</packaging>` and a `main` class; Gradle `application` plugin or `mainClass` setting
  - _.NET_: `.csproj`/`.fsproj` with `<OutputType>Exe</OutputType>` or `<OutputType>WinExe</OutputType>`
  - _General_: Dockerfile, a runnable entrypoint, no public API surface intended for import by other projects
- **Libraries**: Reusable packages consumed by other projects. Common indicators: `"main"`/`"exports"` in `package.json`, Maven/Gradle packaging as a library jar, .NET `<OutputType>Library</OutputType>`, named exports intended for import by other packages.

**Destination directory rules**:

- Applications → `apps/<name>`. Check workspace globs (e.g. `pnpm-workspace.yaml`, `workspaces` in root `package.json`) for an existing `apps/*` entry.
  - If `apps/*` is **not** present, add it before importing: update the workspace glob config and commit (or stage) the change.
  - Example: `nx import <source> apps/my-app --source=packages/my-app`
- Libraries → follow the dest's existing convention (`packages/`, `libs/`, etc.).

## Common Issues

See [references/COMMON-ISSUES.md](references/COMMON-ISSUES.md) for detailed common issues and fixes.

## Non-Nx Source Issues

See [references/NON-NX-ISSUES.md](references/NON-NX-ISSUES.md) for issues when importing non-Nx workspaces.

## Technology-specific Guidance

Identify technologies in the source repo, then read and apply the matching reference file(s).

Available references:

- `references/ESLINT.md` — ESLint projects: duplicate `lint`/`eslint:lint` targets, legacy `.eslintrc.*` linting generated files, flat config `.cjs` self-linting, `typescript-eslint` v7/v9 peer dep conflict, mixed ESLint v8+v9 in one workspace.
- `references/GRADLE.md`
- `references/JEST.md` — Jest testing: `@nx/jest/plugin` setup, jest.preset.js, testing deps by framework, tsconfig.spec.json, Jest vs Vitest coexistence, Babel transforms, CI atomization.
- `references/NEXT.md` — Next.js projects: `@nx/next/plugin` targets, `withNx`, Next.js TS config (`noEmit`, `jsx: "preserve"`), auto-installing deps via wrong PM, non-Nx `create-next-app` imports, mixed Next.js+Vite coexistence.
- `references/TURBOREPO.md`
- `references/VITE.md` — Vite projects (React, Vue, or both): `@nx/vite/plugin` typecheck target, `resolve.alias`/`__dirname` fixes, framework deps, Vue-specific setup, mixed React+Vue coexistence.
