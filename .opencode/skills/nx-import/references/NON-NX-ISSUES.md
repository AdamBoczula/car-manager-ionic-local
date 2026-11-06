## Non-Nx Source Issues

When the source is a plain pnpm/npm workspace without `nx.json`.

### npm Script Rewriting (Critical)

Nx rewrites `package.json` scripts during init, creating broken commands (e.g. `vitest run` → `nx test run`). **Fix**: Remove all rewritten scripts — Nx plugins infer targets from config files.

### `noEmit` → `composite` + `emitDeclarationOnly` (Critical)

Plain TS projects use `"noEmit": true`, incompatible with Nx project references.

**Symptoms**: "typecheck target is disabled because one or more project references set 'noEmit: true'" or TS6310.

**Fix** in **all** imported tsconfigs:

1. Remove `"noEmit": true`. If inherited via extends chain, set `"noEmit": false` explicitly.
2. Add `"composite": true`, `"emitDeclarationOnly": true`, `"declarationMap": true`
3. Add `"outDir": "dist"` and `"tsBuildInfoFile": "dist/tsconfig.tsbuildinfo"`
4. Add `"extends": "../../tsconfig.base.json"` if missing. Remove settings now inherited from base.

### Stale node_modules and Lockfiles

`nx import` may bring `node_modules/` (pnpm symlinks pointing to the source filesystem) and `pnpm-lock.yaml` from the source. Both are stale.

**Fix**: `rm -rf imported/node_modules imported/pnpm-lock.yaml imported/pnpm-workspace.yaml imported/.gitignore`, then `pnpm install`.

### ESLint Config Handling

- **Legacy `.eslintrc.json` (ESLint 8)**: Delete all `.eslintrc.*`, remove v8 deps, create flat `eslint.config.mjs`.
- **Flat config (`eslint.config.js`)**: Self-contained configs can often be left as-is.
- **No ESLint**: Create both root and project-level configs from scratch.

### TypeScript `paths` Aliases

Nx uses `package.json` `"exports"` + pnpm workspace linking instead of tsconfig `"paths"`. If packages have proper `"exports"`, paths are redundant. Otherwise, update paths for the new directory structure.