## Common Issues

### pnpm Workspace Globs (Critical)

`nx import` adds the imported directory itself (e.g. `apps`) to `pnpm-workspace.yaml`, **NOT** glob patterns for packages within it. Cross-package imports will fail with `Cannot find module`.

**Fix**: Replace with proper globs from the source config (e.g. `apps/*`, `libs/shared/*`), then `pnpm install`.

### Root Dependencies and Config Not Imported (Critical)

`nx import` does **NOT** merge from the source's root:

- `dependencies`/`devDependencies` from `package.json`
- `targetDefaults` from `nx.json` (e.g. `"@nx/esbuild:esbuild": { "dependsOn": ["^build"] }` — critical for build ordering)
- `namedInputs` from `nx.json` (e.g. `production` exclusion patterns for test files)
- Plugin configurations from `nx.json`

**Fix**: Diff source and dest `package.json` + `nx.json`. Add missing deps, merge relevant `targetDefaults` and `namedInputs`.

### TypeScript Project References

After import, run `nx sync --yes`. If it reports nothing but typecheck still fails, `nx reset` first, then `nx sync --yes` again.

### Explicit Executor Path Fixups

Inferred targets (via Nx plugins) resolve config relative to project root — no changes needed. Explicit executor targets (e.g. `@nx/esbuild:esbuild`) have workspace-root-relative paths (`main`, `outputPath`, `tsConfig`, `assets`, `sourceRoot`) that must be prefixed with the import destination directory.

### Plugin Detection

- **Whole-repo import**: `nx import` detects and offers to install plugins. Accept them.
- **Subdirectory import**: Plugins NOT auto-detected. Manually add with `npx nx add @nx/PLUGIN`. Check `include`/`exclude` patterns — defaults won't match alternate directories (e.g. `apps-beta/`).
- Run `npx nx reset` after any plugin config changes.

### Redundant Root Files (Whole-Repo Only)

Whole-repo import brings ALL source root files into the dest subdirectory. Clean up:

- `pnpm-lock.yaml` — stale; dest has its own lockfile
- `pnpm-workspace.yaml` — source workspace config; conflicts with dest
- `node_modules/` — stale symlinks pointing to source filesystem
- `.gitignore` — redundant with dest root `.gitignore`
- `nx.json` — source Nx config; dest has its own
- `README.md` — optional; keep or remove

**Don't blindly delete** `tsconfig.base.json` — imported projects may extend it via relative paths.

### Root ESLint Config Missing (Subdirectory Import)

Subdirectory import doesn't bring the source's root `eslint.config.mjs`, but project configs reference `../../eslint.config.mjs`.

**Fix order**:

1. Install ESLint deps first: `pnpm add -wD eslint@^9 @nx/eslint-plugin typescript-eslint` (plus framework-specific plugins)
2. Create root `eslint.config.mjs` (copy from source or create with `@nx/eslint-plugin` base rules)
3. Then `npx nx add @nx/eslint` to register the plugin in `nx.json`

Install `typescript-eslint` explicitly — pnpm's strict hoisting won't auto-resolve this transitive dep of `@nx/eslint-plugin`.

### ESLint Version Pinning (Critical)

**Pin ESLint to v9** (`eslint@^9.0.0`). ESLint 10 breaks `@nx/eslint` and many plugins with cryptic errors like `Cannot read properties of undefined (reading 'version')`.

`@nx/eslint` may peer-depend on ESLint 8, causing the wrong version to resolve. If lint fails with `Cannot read properties of undefined (reading 'allow')`, add `pnpm.overrides`:

```json
{ "pnpm": { "overrides": { "eslint": "^9.0.0" } } }
```

### Dependency Version Conflicts

After import, compare key deps (`typescript`, `eslint`, framework-specific). If dest uses newer versions, upgrade imported packages to match (usually safe). If source is newer, may need to upgrade dest first. Use `pnpm.overrides` to enforce single-version policy if desired.

### Module Boundaries

Imported projects may lack `tags`. Add tags or update `@nx/enforce-module-boundaries` rules.

### Project Name Collisions (Multi-Import)

Same `name` in `package.json` across source and dest causes `MultipleProjectsWithSameNameError`. **Fix**: Rename conflicting names (e.g. `@org/api` → `@org/teama-api`), update all dep references and import statements, `pnpm install`. The root `package.json` of each imported repo also becomes a project — rename those too.

### Workspace Dep Import Ordering

`pnpm install` fails during `nx import` if a `"workspace:*"` dependency hasn't been imported yet. File operations still succeed. **Fix**: Import all projects first, then `pnpm install --no-frozen-lockfile`.

### `.gitkeep` Blocking Subdirectory Import

The TS preset creates `packages/.gitkeep`. Remove it and commit before importing.

### Frontend tsconfig Base Settings (Critical)

The TS preset defaults (`module: "nodenext"`, `moduleResolution: "nodenext"`, `lib: ["es2022"]`) are incompatible with frontend frameworks (React, Next.js, Vue, Vite). After importing frontend projects, verify the dest root `tsconfig.base.json`:

- **`moduleResolution`**: Must be `"bundler"` (not `"nodenext"`)
- **`module`**: Must be `"esnext"` (not `"nodenext"`)
- **`lib`**: Must include `"dom"` and `"dom.iterable"` (frontend projects need these)
- **`jsx`**: `"react-jsx"` for React-only workspaces, per-project for mixed frameworks

For **subdirectory imports**, the dest root tsconfig is authoritative — update it. For **whole-repo imports**, imported projects may extend their own nested `tsconfig.base.json`, making this less critical.

If the dest also has backend projects needing `nodenext`, use per-project overrides instead of changing the root.

**Gotcha**: TypeScript does NOT merge `lib` arrays — a project-level override **replaces** the base array entirely. Always include all needed entries (e.g. `es2022`, `dom`, `dom.iterable`) in any project-level `lib`.

### `@nx/react` Typings for Libraries

React libraries generated with `@nx/react:library` reference `@nx/react/typings/cssmodule.d.ts` and `@nx/react/typings/image.d.ts` in their tsconfig `types`. These fail with `Cannot find type definition file` unless `@nx/react` is installed in the dest workspace.

**Fix**: `pnpm add -wD @nx/react`

### Jest Preset Missing (Subdirectory Import)

Nx presets create `jest.preset.js` at the workspace root, and project jest configs reference it (e.g. `../../jest.preset.js`). Subdirectory import does NOT bring this file.

**Fix**:

1. Run `npx nx add @nx/jest` — registers `@nx/jest/plugin` in `nx.json` and updates `namedInputs`
2. Create `jest.preset.js` at workspace root (see `references/JEST.md` for content) — `nx add` only creates this when a generator runs, not on bare `nx add`
3. Install test runner deps: `pnpm add -wD jest jest-environment-jsdom ts-jest @types/jest`
4. Install framework-specific test deps as needed (see `references/JEST.md`)

For deeper Jest issues (tsconfig.spec.json, Babel transforms, CI atomization, Jest vs Vitest coexistence), see `references/JEST.md`.

### Target Name Prefixing (Whole-Repo Import)

When importing a project with existing npm scripts (`build`, `dev`, `start`, `lint`), Nx plugins auto-prefix inferred target names to avoid conflicts: e.g. `next:build`, `vite:build`, `eslint:lint`.

**Fix**: Remove the Nx-rewritten npm scripts from the imported `package.json`, then either:

- Accept the prefixed names (e.g. `nx run app:next:build`)
- Rename plugin target names in `nx.json` to use unprefixed names
