// spec: docs/specs/02-login-screen.md — Faza 1: consumption calculation utility
/**
 * Calculate fuel consumption in liters per 100km.
 *
 * Formula: (liters / (currentMileage - previousMileage)) * 100
 *
 * Returns `null` when:
 * - liters is 0 or negative
 * - mileage delta is 0 or negative (invalid or unchanged mileage)
 *
 * Result is rounded half-up to 2 decimal places.
 *
 * @example
 *   calculateConsumption(45, 50000, 49500) // => 9.0  (45L for 500km = 9.0 L/100km)
 *   calculateConsumption(0, 50000, 49500)  // => null
 *   calculateConsumption(45, 49000, 50000) // => null (negative delta)
 */
export function calculateConsumption(
  liters: number,
  currentMileage: number,
  previousMileage: number,
): number | null {
  if (liters <= 0) return null;

  const delta = currentMileage - previousMileage;
  if (delta <= 0) return null;

  const raw = (liters / delta) * 100;
  return Math.round(raw * 100) / 100;
}

/**
 * Format a number to 2 decimal places rounded half-up.
 * Use for display only — keep raw values for intermediate calculations.
 */
export function roundToDisplay(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format PLN amount for display (e.g. 145.5 => "145,50 zł").
 */
export function formatPln(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} zł`;
}
