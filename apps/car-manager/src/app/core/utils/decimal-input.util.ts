// bugfix: docs/bugs/05-decimal-input-comma-dot.md

/**
 * Format and sanitize user input for decimal numbers in Polish format (comma as separator).
 *
 * Rules:
 * - Replaces any dots (.) with commas (,).
 * - If input starts with a comma, prepends a leading zero ('0,').
 * - Strips any characters that are not digits or comma.
 * - Allows at most one comma; ignores extra commas or dots.
 * - If maxDecimals is provided, limits digits after comma to maxDecimals.
 */
export function formatDecimalInput(value: string | null | undefined, maxDecimals = 2): string {
  if (!value) return '';

  // Replace dots with commas
  let normalized = value.replace(/\./g, ',');

  // If input starts with a comma, prepend 0 (e.g. ',5' -> '0,5')
  if (normalized.startsWith(',')) {
    normalized = '0' + normalized;
  }

  // Remove any character other than digits and commas
  normalized = normalized.replace(/[^\d,]/g, '');

  // Keep only the first comma and enforce max decimals
  const parts = normalized.split(',');
  if (parts.length > 1) {
    let decimals = parts.slice(1).join('');
    if (typeof maxDecimals === 'number' && maxDecimals >= 0) {
      decimals = decimals.slice(0, maxDecimals);
    }
    normalized = `${parts[0]},${decimals}`;
  }

  return normalized;
}

/**
 * Parse a decimal string (using comma or dot) into a JavaScript float.
 * Returns 0 if empty, invalid, or zero.
 */
export function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0;
  const normalized = value.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

/**
 * Prevent non-numeric key presses on physical keyboard events for decimal inputs.
 * Allows digits, comma, dot, and navigation/editing keys.
 */
export function handleDecimalKeyDown(event: KeyboardEvent): void {
  // Allow control/modifier key combinations (e.g. Ctrl+A, Ctrl+C, Ctrl+V)
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  // Allow multi-character navigation / editing keys (Backspace, Delete, ArrowLeft, ArrowRight, Tab, Enter)
  if (event.key.length > 1) {
    return;
  }

  // Allow digits (0-9), comma, and dot
  if (!/[\d,.]/.test(event.key)) {
    event.preventDefault();
  }
}
