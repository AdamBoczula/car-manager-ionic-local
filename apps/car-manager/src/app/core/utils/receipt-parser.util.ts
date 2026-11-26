// spec: docs/specs/refuel/03-receipt-ocr.md
// bugfix: docs/bugs/12-receipt-ocr-android-uri-and-parser.md
import type { TextBlock } from '@capacitor-mlkit/text-recognition';
import type { ReceiptScanResult, RefuelDraft } from '../models/refuel.model';
import { roundToDisplay } from './consumption.util';

const PREMIUM_FUEL_PATTERNS: readonly RegExp[] = [
  /\bVERVA\b/i,
  /\bV[\s-]?POWER\b/i,
  /\bULTIMATE\b/i,
  /\bMILES\s*PLUS\b/i,
  /\bDYNAMIC\b/i,
  /\bSUPREMA\b/i,
  /\bECTO\b/i,
  /\bEVO\s*(?:100|PLUS)\b/i,
  /\bRACING\b/i,
  /\b(?:PB\s*98|E5\s*98|98\s*E5|BENZ(?:YNA)?\s*(?:BEZ[ŁL]OWIOWA\s*|BEZO[ŁL]OWIOWA\s*)?98|EU\s*98)\b/i,
];

const STANDARD_FUEL_PATTERNS: readonly RegExp[] = [
  /\bEFECTA\b/i,
  /\bFUEL\s*SAVE\b/i,
  /\b(?:PB\s*95|E10\s*95|95\s*E10|BENZ(?:YNA)?\s*(?:BEZ[ŁL]OWIOWA\s*|BEZO[ŁL]OWIOWA\s*)?95|EU\s*95)\b/i,
  /\b(?:OLEJ\s*NAP[EĘ]DOWY|DIESEL|LPG|AUTOGAZ|GAZ\s*LPG|ON|E10)\b/i,
  /\bEVO\s*95\b/i,
];

const NON_FUEL_LINE_PATTERNS: readonly RegExp[] = [
  /\b(?:ENERG(?:Y|ETYK)?|NAP[OÓ]J|SUGAR\s*FREE|BEZ\s*CUKRU|ZERO|COLA|PEPSI|WODA|SOK|IZOTONIK)\b/i,
  /\b(?:HOT\s*DOG|KAWA|LATTE|ESPRESSO|CAPPUCCINO|HERBATA|KANAPK|ZAPIEKANK|BURGER|BATON|CHIPS|SNICKERS)\b/i,
  /\b(?:P[ŁL]YN\s*(?:DO|CH[ŁL]ODN|SPRYSK)|OLEJ\s*SILNIK|ADBLUE|MYJNI|MYCIE|GAZ\s*DO\s*ZAPAL)\b/i,
  /\b0[.,](?:2|25|33|5|50|75)\s*l\b/i,
];

const QTY_PRICE_RE =
  /(\d+(?:[.,]\d{1,3})?)\s*(?:l|litr(?:y|ów)?|dm3|szt\.?)?\s*[x*×+•·]\s*(\d+[.,]\d{2,3})(?:\s*=?\s*(\d+[.,]\d{2}))?\s*[a-g]?\b/i;

const LITERS_UNIT_RE = /\b(\d+[.,]\d{1,3})\s*(?:l|litr(?:y|ów)?|dm3)\b/i;

const TOTAL_LINE_RE =
  /(?:SUMA\s*:?\s*(?:PLN|Z[ŁL])?|DO\s*ZAP[ŁL]ATY|RAZEM|KWOTA)\s*:?\s*(?:PLN|Z[ŁL])?\s*(\d+[.,]\d{2})\b/i;

const STANDALONE_AMOUNT_RE = /^\d+[.,]\d{2}\s*[A-G]?$/i;
const DISCOUNT_KEYWORD_RE = /\b(?:[O0]BNI\s*[ŻZŽ]KA|RABAT|UPUST|ZNI\s*[ŻZŽ]KA)\b/i;
const DISCOUNT_VALUE_RE = /-\s*(\d+[.,]\d{2})\s*[A-G]?\b/i;
const DISCOUNT_NEXT_LINE_RE = /^-\s*(\d+[.,]\d{2})\s*[A-G]?$/i;
const UNSIGNED_AMOUNT_RE = /\b(\d+[.,]\d{2})\s*[A-G]?\b/i;
const SUMMARY_LINE_RE = /\b(?:SUMA|DO\s*ZAP[ŁL]ATY|RAZEM|SPRZEDA[ŻZ]|KWOTA\s*PTU|PTU)\b/i;

const ISO_DATE_RE = /\b(20\d{2})[-./](\d{2})[-./](\d{2})\b/;
const PL_DATE_RE = /\b(\d{2})[-./](\d{2})[-./](20\d{2})\b/;

interface FuelLineMatch {
  amount?: number;
  liters?: number;
  isPremium: boolean;
}

interface PositionedLine {
  text: string;
  left: number;
  top: number;
  bottom: number;
  cy: number;
  height: number;
}

interface VisualRow {
  items: PositionedLine[];
  avgCy: number;
  avgHeight: number;
  minTop: number;
  maxBottom: number;
}

function parseNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseFloat(raw.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isValidIsoDateParts(year: number, month: number, day: number): boolean {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

function formatIsoDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function extractDate(lines: readonly string[]): string | undefined {
  for (const line of lines) {
    const isoMatch = ISO_DATE_RE.exec(line);
    if (isoMatch) {
      const year = Number.parseInt(isoMatch[1], 10);
      const month = Number.parseInt(isoMatch[2], 10);
      const day = Number.parseInt(isoMatch[3], 10);
      if (isValidIsoDateParts(year, month, day)) {
        return formatIsoDate(year, month, day);
      }
    }

    const plMatch = PL_DATE_RE.exec(line);
    if (plMatch) {
      const day = Number.parseInt(plMatch[1], 10);
      const month = Number.parseInt(plMatch[2], 10);
      const year = Number.parseInt(plMatch[3], 10);
      if (isValidIsoDateParts(year, month, day)) {
        return formatIsoDate(year, month, day);
      }
    }
  }

  return undefined;
}

function isNonFuelLine(line: string): boolean {
  return NON_FUEL_LINE_PATTERNS.some((re) => re.test(line));
}

function classifyFuelKeyword(line: string): 'premium' | 'standard' | null {
  if (isNonFuelLine(line)) {
    return null;
  }
  if (PREMIUM_FUEL_PATTERNS.some((re) => re.test(line))) {
    return 'premium';
  }
  if (STANDARD_FUEL_PATTERNS.some((re) => re.test(line))) {
    return 'standard';
  }
  return null;
}

function extractQtyPrice(line: string): { liters: number; amount?: number } | null {
  const match = QTY_PRICE_RE.exec(line);
  if (!match) return null;

  const qty = parseNumber(match[1]);
  const unitPrice = parseNumber(match[2]);
  const explicitTotal = parseNumber(match[3]);

  if (qty == null || unitPrice == null) return null;
  if (qty <= 0 || qty > 300 || unitPrice < 1.5 || unitPrice > 25) return null;

  const liters = roundToDisplay(qty);
  const amount =
    explicitTotal != null && explicitTotal > 0
      ? roundToDisplay(explicitTotal)
      : roundToDisplay(qty * unitPrice);

  return { liters, amount };
}

function applyFollowingFuelDiscount(
  lines: readonly string[],
  fuelEndIndex: number,
  initialAmount: number | undefined,
): number | undefined {
  if (initialAmount == null) return undefined;

  let amount = initialAmount;
  const maxIndex = Math.min(lines.length - 1, fuelEndIndex + 3);

  for (let j = fuelEndIndex + 1; j <= maxIndex; j++) {
    const nextLine = lines[j];

    if (STANDALONE_AMOUNT_RE.test(nextLine)) {
      const printedTotal = parseNumber(nextLine.replace(/[^\d.,]/g, ''));
      if (printedTotal != null && Math.abs(printedTotal - amount) <= 0.05) {
        amount = roundToDisplay(printedTotal);
        continue;
      }
      break;
    }

    if (
      SUMMARY_LINE_RE.test(nextLine) ||
      QTY_PRICE_RE.test(nextLine) ||
      classifyFuelKeyword(nextLine) !== null ||
      isNonFuelLine(nextLine)
    ) {
      break;
    }

    if (DISCOUNT_KEYWORD_RE.test(nextLine)) {
      const sameLineMatch = DISCOUNT_VALUE_RE.exec(nextLine) ?? UNSIGNED_AMOUNT_RE.exec(nextLine);
      const nextLineMatch =
        !sameLineMatch && j + 1 < lines.length ? DISCOUNT_NEXT_LINE_RE.exec(lines[j + 1]) : null;
      const discount = parseNumber((sameLineMatch ?? nextLineMatch)?.[1]);

      if (discount != null && discount > 0 && discount < amount) {
        amount = roundToDisplay(amount - discount);
      }
      break;
    }
  }

  return amount;
}

function extractFuelLine(lines: readonly string[]): FuelLineMatch | null {
  let detectedType: 'premium' | 'standard' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fuelType = classifyFuelKeyword(line);
    if (!fuelType) continue;

    // Ignore isolated "ON" unless a quantity/price line is present on this or the next line.
    const sameLineMetrics = extractQtyPrice(line);
    const nextLineMetrics =
      i + 1 < lines.length && !isNonFuelLine(lines[i + 1]) ? extractQtyPrice(lines[i + 1]) : null;
    const metrics = sameLineMetrics ?? nextLineMetrics;

    if (metrics) {
      const combinedLine =
        nextLineMetrics && i + 1 < lines.length ? `${line} ${lines[i + 1]}` : line;
      const combinedType = classifyFuelKeyword(combinedLine) ?? fuelType;
      const fuelEndIndex = sameLineMetrics ? i : i + 1;

      return {
        liters: metrics.liters,
        amount: applyFollowingFuelDiscount(lines, fuelEndIndex, metrics.amount),
        isPremium: combinedType === 'premium',
      };
    }

    if (fuelType === 'premium' || !/\bON\b/i.test(line)) {
      detectedType ??= fuelType;
    }
  }

  if (detectedType) {
    return { isPremium: detectedType === 'premium' };
  }

  return null;
}

function extractFallbackLiters(lines: readonly string[]): number | undefined {
  for (const line of lines) {
    if (isNonFuelLine(line) || /\bszt\.?\b/i.test(line)) {
      continue;
    }

    const qp = extractQtyPrice(line);
    if (qp) return qp.liters;

    const unitMatch = LITERS_UNIT_RE.exec(line);
    if (unitMatch) {
      const val = parseNumber(unitMatch[1]);
      if (val != null && val > 0 && val <= 300) {
        return roundToDisplay(val);
      }
    }
  }
  return undefined;
}

function extractFallbackTotalAmount(lines: readonly string[]): number | undefined {
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = TOTAL_LINE_RE.exec(lines[i]);
    if (match) {
      const total = parseNumber(match[1]);
      if (total != null && total > 0) {
        return roundToDisplay(total);
      }
    }
  }
  return undefined;
}

function belongsToVisualRow(row: VisualRow, item: PositionedLine): boolean {
  const overlap = Math.min(row.maxBottom, item.bottom) - Math.max(row.minTop, item.top);
  const minHeight = Math.min(row.avgHeight, item.height);
  if (overlap > minHeight * 0.3) {
    return true;
  }
  const tolerance = Math.max(row.avgHeight, item.height) * 0.55;
  return Math.abs(item.cy - row.avgCy) <= tolerance;
}

/**
 * Reconstruct receipt lines in reading order from ML Kit `TextBlock` bounding boxes
 * so two-column fiscal receipts keep labels and amounts on the same line.
 * Falls back to `rawText` when bounding box geometry is unavailable.
 */
export function buildReceiptTextFromOcr(rawText: string, blocks?: readonly TextBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return rawText;
  }

  const positioned: PositionedLine[] = [];
  for (const block of blocks) {
    for (const line of block.lines) {
      const text = line.text.trim();
      const box = line.boundingBox;
      if (!text || !box) continue;

      positioned.push({
        text,
        left: box.left,
        top: box.top,
        bottom: box.bottom,
        cy: (box.top + box.bottom) / 2,
        height: Math.max(1, box.bottom - box.top),
      });
    }
  }

  if (positioned.length === 0) {
    return rawText;
  }

  positioned.sort((a, b) => a.cy - b.cy || a.left - b.left);

  const rows: VisualRow[] = [];
  for (const item of positioned) {
    const lastRow = rows.at(-1);
    if (lastRow && belongsToVisualRow(lastRow, item)) {
      lastRow.items.push(item);
      const count = lastRow.items.length;
      lastRow.avgCy = lastRow.items.reduce((sum, entry) => sum + entry.cy, 0) / count;
      lastRow.avgHeight = lastRow.items.reduce((sum, entry) => sum + entry.height, 0) / count;
      lastRow.minTop = Math.min(lastRow.minTop, item.top);
      lastRow.maxBottom = Math.max(lastRow.maxBottom, item.bottom);
    } else {
      rows.push({
        items: [item],
        avgCy: item.cy,
        avgHeight: item.height,
        minTop: item.top,
        maxBottom: item.bottom,
      });
    }
  }

  return rows
    .map((row) =>
      row.items
        .slice()
        .sort((a, b) => a.left - b.left)
        .map((entry) => entry.text)
        .join(' '),
    )
    .join('\n');
}

function normalizeOcrDecimalSpaces(line: string): string {
  return line.replace(/(\d+[.,])\s+(\d{2})(?=$|[^\d-])/g, '$1$2');
}

/**
 * Parse raw OCR text from a Polish fuel station receipt into a structured RefuelDraft.
 *
 * Pure function: does not perform I/O or throw on malformed input.
 */
export function parsePolishFuelReceipt(rawText: string): ReceiptScanResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeOcrDecimalSpaces(line.trim()))
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { draft: {}, rawText, matchedFields: [] };
  }

  const date = extractDate(lines);
  const fuelLine = extractFuelLine(lines);

  const amount = fuelLine?.amount ?? extractFallbackTotalAmount(lines);
  const liters = fuelLine?.liters ?? extractFallbackLiters(lines);
  const isPremium = fuelLine?.isPremium;

  const draft: RefuelDraft = {};
  const matchedFields: (keyof RefuelDraft)[] = [];

  if (date !== undefined) {
    draft.date = date;
    matchedFields.push('date');
  }
  if (amount !== undefined) {
    draft.amount = amount;
    matchedFields.push('amount');
  }
  if (liters !== undefined) {
    draft.liters = liters;
    matchedFields.push('liters');
  }
  if (isPremium !== undefined) {
    draft.isPremium = isPremium;
    matchedFields.push('isPremium');
  }

  return { draft, rawText, matchedFields };
}
