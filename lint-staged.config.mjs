/**
 * lint-staged configuration — runs on staged files in the Husky pre-commit hook.
 *
 * Scope is intentionally narrow: only Prettier formatting. Full linting
 * (ESLint, knip, jscpd) stays in `npm run quality` and in CI, so the commit
 * hook stays fast. `.agents/` is excluded via .prettierignore (vendored
 * third-party skill references must not be reformatted).
 */
export default {
  '*.{ts,js,mjs,cjs,json,md,scss,css,html,yml,yaml}': 'prettier --write',
};
