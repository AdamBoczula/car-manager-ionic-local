// bugfix: docs/bugs/05-decimal-input-comma-dot.md
// covers: docs/bugs/05-decimal-input-comma-dot.md

import { describe, it, expect, vi } from 'vitest';
import { formatDecimalInput, parseDecimal, handleDecimalKeyDown } from './decimal-input.util';

describe('decimal-input.util', () => {
  describe('formatDecimalInput', () => {
    it('should return empty string for null, undefined, or empty string', () => {
      expect(formatDecimalInput(null)).toBe('');
      expect(formatDecimalInput(undefined)).toBe('');
      expect(formatDecimalInput('')).toBe('');
    });

    it('should keep integer numbers as-is', () => {
      expect(formatDecimalInput('125')).toBe('125');
      expect(formatDecimalInput('0')).toBe('0');
    });

    it('should replace dot with comma', () => {
      expect(formatDecimalInput('12.')).toBe('12,');
      expect(formatDecimalInput('12.5')).toBe('12,5');
      expect(formatDecimalInput('12.50')).toBe('12,50');
    });

    it('should preserve comma as decimal separator', () => {
      expect(formatDecimalInput('12,')).toBe('12,');
      expect(formatDecimalInput('12,5')).toBe('12,5');
      expect(formatDecimalInput('12,50')).toBe('12,50');
    });

    it('should prepend 0 when starting with comma or dot', () => {
      expect(formatDecimalInput(',')).toBe('0,');
      expect(formatDecimalInput('.')).toBe('0,');
      expect(formatDecimalInput(',5')).toBe('0,5');
      expect(formatDecimalInput('.5')).toBe('0,5');
    });

    it('should prevent multiple commas or dots', () => {
      expect(formatDecimalInput('12,,5')).toBe('12,5');
      expect(formatDecimalInput('12..5')).toBe('12,5');
      expect(formatDecimalInput('12,5,3')).toBe('12,53');
      expect(formatDecimalInput('12.5.3')).toBe('12,53');
    });

    it('should strip non-numeric and non-separator characters', () => {
      expect(formatDecimalInput('abc12.50xyz')).toBe('12,50');
      expect(formatDecimalInput('12-3')).toBe('123');
      expect(formatDecimalInput(' 25,50 ')).toBe('25,50');
    });

    it('should limit decimals according to maxDecimals parameter', () => {
      expect(formatDecimalInput('12,3456', 2)).toBe('12,34');
      expect(formatDecimalInput('12,3456', 3)).toBe('12,345');
      expect(formatDecimalInput('12,3456', 0)).toBe('12,');
    });
  });

  describe('parseDecimal', () => {
    it('should return 0 for empty or invalid values', () => {
      expect(parseDecimal(null)).toBe(0);
      expect(parseDecimal(undefined)).toBe(0);
      expect(parseDecimal('')).toBe(0);
      expect(parseDecimal('abc')).toBe(0);
    });

    it('should parse integers correctly', () => {
      expect(parseDecimal('250')).toBe(250);
      expect(parseDecimal('0')).toBe(0);
    });

    it('should parse numbers with comma or dot correctly', () => {
      expect(parseDecimal('12,5')).toBe(12.5);
      expect(parseDecimal('12.5')).toBe(12.5);
      expect(parseDecimal('250,99')).toBe(250.99);
      expect(parseDecimal('250.99')).toBe(250.99);
      expect(parseDecimal('0,5')).toBe(0.5);
    });

    it('should handle incomplete decimal strings gracefully', () => {
      expect(parseDecimal('12,')).toBe(12);
      expect(parseDecimal('12.')).toBe(12);
      expect(parseDecimal(',5')).toBe(0.5);
      expect(parseDecimal('.5')).toBe(0.5);
    });
  });

  describe('handleDecimalKeyDown', () => {
    function createMockEvent(
      key: string,
      modifiers?: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean },
    ) {
      return {
        key,
        ctrlKey: modifiers?.ctrlKey ?? false,
        metaKey: modifiers?.metaKey ?? false,
        altKey: modifiers?.altKey ?? false,
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent;
    }

    it('should allow digits, comma, and dot', () => {
      const dotEvent = createMockEvent('.');
      handleDecimalKeyDown(dotEvent);
      expect(dotEvent.preventDefault).not.toHaveBeenCalled();

      const commaEvent = createMockEvent(',');
      handleDecimalKeyDown(commaEvent);
      expect(commaEvent.preventDefault).not.toHaveBeenCalled();

      const digitEvent = createMockEvent('5');
      handleDecimalKeyDown(digitEvent);
      expect(digitEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should allow navigation and editing keys (multi-character key names)', () => {
      const backspaceEvent = createMockEvent('Backspace');
      handleDecimalKeyDown(backspaceEvent);
      expect(backspaceEvent.preventDefault).not.toHaveBeenCalled();

      const arrowLeftEvent = createMockEvent('ArrowLeft');
      handleDecimalKeyDown(arrowLeftEvent);
      expect(arrowLeftEvent.preventDefault).not.toHaveBeenCalled();

      const tabEvent = createMockEvent('Tab');
      handleDecimalKeyDown(tabEvent);
      expect(tabEvent.preventDefault).not.toHaveBeenCalled();

      const enterEvent = createMockEvent('Enter');
      handleDecimalKeyDown(enterEvent);
      expect(enterEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should allow modifier combinations (e.g. Ctrl+A, Ctrl+V)', () => {
      const pasteEvent = createMockEvent('v', { ctrlKey: true });
      handleDecimalKeyDown(pasteEvent);
      expect(pasteEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should prevent non-numeric characters', () => {
      const letterEvent = createMockEvent('a');
      handleDecimalKeyDown(letterEvent);
      expect(letterEvent.preventDefault).toHaveBeenCalled();

      const dashEvent = createMockEvent('-');
      handleDecimalKeyDown(dashEvent);
      expect(dashEvent.preventDefault).toHaveBeenCalled();

      const spaceEvent = createMockEvent(' ');
      handleDecimalKeyDown(spaceEvent);
      expect(spaceEvent.preventDefault).toHaveBeenCalled();
    });
  });
});
