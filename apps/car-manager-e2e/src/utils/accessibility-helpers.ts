import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility helpers for Car Manager e2e tests.
 *
 * Uses @axe-core/playwright to run axe-core audits on any page.
 */

/**
 * Options for the accessibility check.
 */
export interface AccessibilityCheckOptions {
  /** Only include violations with these impact levels. Default: ['critical', 'serious'] */
  includedImpacts?: ('minor' | 'moderate' | 'serious' | 'critical')[];
  /** Rules to disable (by rule ID). Useful for known false positives. */
  disabledRules?: string[];
  /** Custom snapshot file name (without path). Default: auto-generated from the page URL. */
  snapshotName?: string;
}

const DEFAULT_OPTIONS: AccessibilityCheckOptions = {
  includedImpacts: ['critical', 'serious'],
  disabledRules: [],
};

/**
 * Run an axe-core accessibility audit on the current page.
 * Asserts that there are no violations at the specified impact levels.
 *
 * @example
 *   await checkAccessibility(page); // checks critical + serious violations
 *   await checkAccessibility(page, { disabledRules: ['color-contrast'] }); // skips known issue
 */
export async function checkAccessibility(
  page: Page,
  options: AccessibilityCheckOptions = {},
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const builder = new AxeBuilder({ page });

  if (opts.disabledRules && opts.disabledRules.length > 0) {
    builder.disableRules(opts.disabledRules);
  }

  const results = await builder.analyze();
  const filteredViolations = results.violations.filter((v) =>
    opts.includedImpacts!.includes(v.impact as 'minor' | 'moderate' | 'serious' | 'critical'),
  );

  if (filteredViolations.length > 0) {
    // Format a readable summary for the test output
    const summary = filteredViolations
      .map(
        (v) =>
          `  ❌ ${v.id} (${v.impact}): ${v.help}\n     ${v.helpUrl}\n     Elements: ${v.nodes.length}`,
      )
      .join('\n');

    expect.soft(filteredViolations, `Accessibility violations found:\n${summary}`).toHaveLength(0);
  }
}
