// spec: docs/specs/02-login-screen.md
import { calculateConsumption, roundToDisplay, formatPln } from './consumption.util';

describe('calculateConsumption', () => {
  it('powinien wyliczyć spalanie 9.0 L/100km (45L na 500km)', () => {
    const result = calculateConsumption(45, 50000, 49500);
    expect(result).toBe(9);
  });

  it('powinien wyliczyć spalanie 7.58 L/100km (37.9L na 500km)', () => {
    const result = calculateConsumption(37.9, 52700, 52200);
    expect(result).toBe(7.58);
  });

  it('powinien zaokrąglić do 2 miejsc po przecinku (half-up)', () => {
    const result = calculateConsumption(42.5, 50000, 49500);
    // (42.5 / 500) * 100 = 8.5
    expect(result).toBe(8.5);
  });

  it('powinien zwrócić null gdy liters <= 0', () => {
    expect(calculateConsumption(0, 50000, 49500)).toBeNull();
    expect(calculateConsumption(-5, 50000, 49500)).toBeNull();
  });

  it('powinien zwrócić null gdy currentMileage <= previousMileage', () => {
    expect(calculateConsumption(45, 49500, 50000)).toBeNull();
    expect(calculateConsumption(45, 50000, 50000)).toBeNull();
  });

  it('powinien zwrócić null gdy delta = 0', () => {
    expect(calculateConsumption(45, 50000, 50000)).toBeNull();
  });
});

describe('roundToDisplay', () => {
  it('powinien zaokrąglić half-up do 2 miejsc', () => {
    expect(roundToDisplay(7.555)).toBe(7.56);
    expect(roundToDisplay(7.554)).toBe(7.55);
    expect(roundToDisplay(9)).toBe(9);
  });
});

describe('formatPln', () => {
  it('powinien formatować PLN z przecinkiem', () => {
    expect(formatPln(145.5)).toBe('145,50 zł');
    expect(formatPln(99.99)).toBe('99,99 zł');
    expect(formatPln(1000)).toBe('1000,00 zł');
  });
});
