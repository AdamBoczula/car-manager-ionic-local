// spec: docs/specs/refuel/03-receipt-ocr.md
// covers: docs/specs/refuel/03-receipt-ocr.md#AC-2
// covers: docs/specs/refuel/03-receipt-ocr.md#AC-3
// covers: docs/bugs/12-receipt-ocr-android-uri-and-parser.md
import type { TextBlock } from '@capacitor-mlkit/text-recognition';
import { buildReceiptTextFromOcr, parsePolishFuelReceipt } from './receipt-parser.util';

describe('parsePolishFuelReceipt', () => {
  it('parses Orlen standard Efecta 95 receipt (single-line format)', () => {
    const receipt = `
      PKN ORLEN S.A.
      STACJA PALIW NR 1234
      2026-11-24 14:32
      PB95 EFECTA 40,00 x 6,25 250,00A
      SUMA PLN 250,00
    `;

    const result = parsePolishFuelReceipt(receipt);

    expect(result.draft).toEqual({
      date: '2026-11-24',
      amount: 250,
      liters: 40,
      isPremium: false,
    });
    expect(result.matchedFields).toEqual(['date', 'amount', 'liters', 'isPremium']);
  });

  it('parses Orlen Verva ON receipt as premium fuel', () => {
    const receipt = `
      ORLEN STACJA 441
      Data: 15.11.2026
      VERVA ON 45,125 L x 6,79 306,40A
      SUMA PLN 306,40
    `;

    const result = parsePolishFuelReceipt(receipt);

    expect(result.draft).toEqual({
      date: '2026-11-15',
      amount: 306.4,
      liters: 45.13,
      isPremium: true,
    });
  });

  it('parses two-line Posnet/Elzab receipt (Shell V-Power)', () => {
    const receipt = `
      SHELL POLSKA SP. Z O.O.
      18-10-2026
      V-Power Racing 100
      32.450 * 7.49 243.05 A
      DO ZAPLATY: 243.05
    `;

    const result = parsePolishFuelReceipt(receipt);

    expect(result.draft).toEqual({
      date: '2026-10-18',
      amount: 243.05,
      liters: 32.45,
      isPremium: true,
    });
  });

  it('recognizes BP Ultimate 98 and Circle K MilesPlus as premium', () => {
    const bp = parsePolishFuelReceipt(`
      BP EUROPA SE
      2026/09/05
      BP Ultimate 98 20,00 x 7,15 143,00A
    `);
    expect(bp.draft.isPremium).toBe(true);
    expect(bp.draft.date).toBe('2026-09-05');

    const circleK = parsePolishFuelReceipt(`
      CIRCLE K POLSKA
      05/09/2026
      MILESPLUS DIESEL 50,00 x 6,60 330,00A
    `);
    expect(circleK.draft.isPremium).toBe(true);
    expect(circleK.draft.date).toBe('2026-09-05');
    expect(circleK.draft.amount).toBe(330);
    expect(circleK.draft.liters).toBe(50);
  });

  // covers: docs/specs/refuel/03-receipt-ocr.md#AC-3
  it('prefers fuel line amount over SUMA PLN on mixed receipt (fuel + coffee + hot-dog)', () => {
    const receipt = `
      PKN ORLEN S.A.
      24.11.2026
      ON EFECTA 40,00 x 6,25 250,00A
      KAWA LATTE 1 x 12,99 12,99A
      HOT DOG MAX 1 x 9,99 9,99A
      SUMA PLN 272,98
    `;

    const result = parsePolishFuelReceipt(receipt);

    expect(result.draft.amount).toBe(250);
    expect(result.draft.liters).toBe(40);
    expect(result.draft.isPremium).toBe(false);
  });

  // covers: docs/bugs/12-receipt-ocr-android-uri-and-parser.md
  it('parses real Orlen receipt with ENERG VERVA drink, EFECTA DIESEL and OBNIŻKA discount', () => {
    const receipt = `
      Polski Koncern Naftowy ORLEN S.A.
      09-411 PŁOCK, UL.CHEMIKÓW 7
      STACJA PALIW NR 1339 W WARSZAWIE
      NIP: 774-00-01-454
      PARAGON FISKALNY
      ENERG VERVA SUGAR FREE 0,25l (A) 1*5.49
      5.49A
      OBNIŻKA -0.55A
      EFECTA DIESEL CN27102011 (A)D(5) 60.68*6.99
      424.15A
      OBNIŻKA -6.06A
      HOT DOG MEGA Z PARÓWKĄ Z SZYN. (B) 1*8.99
      8.99B
      OBNIŻKA -0.90B
      HOT DOG Z KIEŁBASKĄ (B) 1*6.99 6.99B
      OBNIŻKA -0.70B
      Suma obniżek: 8.21
      Sprzedaż opodatkowana A: 423.03
      SUMA PTU 80.17
      SUMA: PLN 437.41
      DO ZAPŁATY: 437.41
    `;

    const result = parsePolishFuelReceipt(receipt);

    expect(result.draft).toEqual({
      amount: 418.09,
      liters: 60.68,
      isPremium: false,
    });
  });

  // covers: docs/bugs/12-receipt-ocr-android-uri-and-parser.md
  it('handles real Android ML Kit OCR artifacts (+, •, 0BNIŽKA, spaced decimals)', () => {
    const mlkitReceipt = `
      ORLENN
      Polski Koncern NaftoNy ORLEN S.A.
      09-411 PŁ0CK, UL.CHEHIKOW 7
      STACJA PALIW NR 1339 W WARSZAWIE
      L. WOŁOSKA 28, 02-675 WARSZAWA
      NIP: 774-00-01-454 W333171
      PARAGON FISKALNY
      ENERG VERVA SUGAR FREE 0,251 (A) 1•5,49 5.49A
      0BNIŽKA -0.55A
      EFECTA DIESEL CN27102011 (A)D(5) 60.68+6.99
      424. 15A
      0BNIŽKA -6.06A
      HOT DOG MEGA Z PARÓWKĄ Z SZYN. (B) 1*8.99
      8.99B
      0BNI ŻKA -0.90B
      SuMa obnizek: 8.21
      SUMA: PLN 437.41
    `;

    const result = parsePolishFuelReceipt(mlkitReceipt);
    expect(result.draft).toEqual({
      amount: 418.09,
      liters: 60.68,
      isPremium: false,
    });

    const spacedTotal = parsePolishFuelReceipt(`
      UL. WOŁOSKA 28, 02-675 WARSZAWA
      DO ZAPŁATY: 437. 41
    `);
    expect(spacedTotal.draft).toEqual({
      amount: 437.41,
    });
  });

  // covers: docs/bugs/12-receipt-ocr-android-uri-and-parser.md
  it('reconstructs two-column ML Kit TextBlock layout before parsing', () => {
    const blocks: TextBlock[] = [
      {
        text: 'EFECTA DIESEL CN27102011 (A)D(5) 60.68*6.99\nOBNIŻKA\nSUMA:',
        lines: [
          {
            text: 'EFECTA DIESEL CN27102011 (A)D(5) 60.68*6.99',
            boundingBox: { left: 20, top: 200, right: 320, bottom: 222 },
            elements: [],
          },
          {
            text: 'OBNIŻKA',
            boundingBox: { left: 20, top: 250, right: 110, bottom: 272 },
            elements: [],
          },
          {
            text: 'SUMA:',
            boundingBox: { left: 20, top: 400, right: 100, bottom: 424 },
            elements: [],
          },
        ],
        elements: [],
      } as unknown as TextBlock,
      {
        text: '424.15A\n-6.06A\nPLN 437.41',
        lines: [
          {
            text: '424.15A',
            boundingBox: { left: 260, top: 226, right: 335, bottom: 248 },
            elements: [],
          },
          {
            text: '-6.06A',
            boundingBox: { left: 265, top: 251, right: 335, bottom: 271 },
            elements: [],
          },
          {
            text: 'PLN 437.41',
            boundingBox: { left: 210, top: 401, right: 335, bottom: 423 },
            elements: [],
          },
        ],
        elements: [],
      } as unknown as TextBlock,
    ];

    const reconstructed = buildReceiptTextFromOcr('fallback text', blocks);
    expect(reconstructed).toContain('OBNIŻKA -6.06A');
    expect(reconstructed).toContain('SUMA: PLN 437.41');

    const parsed = parsePolishFuelReceipt(reconstructed);
    expect(parsed.draft.amount).toBe(418.09);
    expect(parsed.draft.liters).toBe(60.68);
    expect(parsed.draft.isPremium).toBe(false);
  });

  it('matches SUMA: PLN total and ignores SUMA PTU / Suma obniżek in fallback mode', () => {
    const receipt = `
      STACJA PALIW
      Suma obniżek: 8.21
      Kwota PTU A 23% 79.10
      SUMA PTU 80.17
      SUMA: PLN 437.41
    `;

    const result = parsePolishFuelReceipt(receipt);
    expect(result.draft.amount).toBe(437.41);
  });

  it('does not interpret SZT piece quantities as fuel liters in fallback mode', () => {
    const receipt = `
      SKLEP
      12.04.2025
      PRODUKT 1 SZT * 15,00 = 15,00 A
      SUMA PLN 15,00
    `;

    const result = parsePolishFuelReceipt(receipt);
    expect(result.draft.liters).toBeUndefined();
    expect(result.draft.amount).toBe(15);
    expect(result.draft.date).toBe('2025-04-12');
  });

  it('computes fuel amount from liters * unitPrice when total is missing on fuel line', () => {
    const receipt = `
      MOYA STACJA
      2026-11-20
      PB95 30,000 x 6,10
      KAWA 10,00A
      SUMA PLN 193,00
    `;

    const result = parsePolishFuelReceipt(receipt);

    expect(result.draft.liters).toBe(30);
    expect(result.draft.amount).toBe(183);
    expect(result.draft.isPremium).toBe(false);
  });

  it('falls back to SUMA PLN when fuel line has no numeric breakdown', () => {
    const receipt = `
      STACJA PALIW
      24.11.2026
      PALIWO
      SUMA PLN 199,50
    `;

    const result = parsePolishFuelReceipt(receipt);

    expect(result.draft.amount).toBe(199.5);
    expect(result.draft.date).toBe('2026-11-24');
  });

  it('does not treat "98" in NIP, street number or price as premium fuel', () => {
    const receipt = `
      STACJA PALIW
      NIP 525-98-12-345
      UL. POLNA 98
      2026-11-24
      PB95 30,00 x 5,98 179,40A
    `;

    const result = parsePolishFuelReceipt(receipt);

    expect(result.draft.isPremium).toBe(false);
    expect(result.draft.amount).toBe(179.4);
  });

  it('returns empty draft for blank or unreadable noise text', () => {
    expect(parsePolishFuelReceipt('')).toEqual({
      draft: {},
      rawText: '',
      matchedFields: [],
    });

    const noisy = parsePolishFuelReceipt('### blurred %%% 12345 ???');
    expect(noisy.draft).toEqual({});
    expect(noisy.matchedFields).toEqual([]);
  });

  it('ignores invalid calendar dates', () => {
    const result = parsePolishFuelReceipt('31.02.2026\nSUMA PLN 100,00');
    expect(result.draft.date).toBeUndefined();
    expect(result.draft.amount).toBe(100);
  });
});
