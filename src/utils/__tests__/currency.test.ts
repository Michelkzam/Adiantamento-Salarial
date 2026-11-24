import { describe, it, expect } from 'vitest';
import { formatBRL, formatBRLCompact, numberToWords } from '../currency';

describe('currency utils', () => {
  describe('formatBRL', () => {
    it('should format zero correctly', () => {
      expect(formatBRL(0)).toMatch(/R\$\s0,00/);
    });

    it('should format positive values correctly', () => {
      expect(formatBRL(1500.5)).toMatch(/R\$\s1\.500,50/);
    });

    it('should format large values correctly', () => {
      expect(formatBRL(1000000)).toMatch(/R\$\s1\.000\.000,00/);
    });

    it('should format small values correctly', () => {
      expect(formatBRL(0.5)).toMatch(/R\$\s0,50/);
    });
  });

  describe('formatBRLCompact', () => {
    it('should format values without R$ symbol', () => {
      expect(formatBRLCompact(1500.5)).toBe('1.500,50');
    });
  });

  describe('numberToWords', () => {
    it('should return zero reais for 0', () => {
      expect(numberToWords(0)).toBe('zero reais');
    });

    it('should handle 1 real', () => {
      expect(numberToWords(1)).toBe('um real');
    });

    it('should handle values under 10', () => {
      expect(numberToWords(5)).toBe('cinco reais');
    });

    it('should handle values under 20', () => {
      expect(numberToWords(15)).toBe('quinze reais');
    });

    it('should handle values under 100', () => {
      expect(numberToWords(42)).toBe('quarenta e dois reais');
    });

    it('should handle exactly 100', () => {
      expect(numberToWords(100)).toBe('cem reais');
    });

    it('should handle values under 1000', () => {
      expect(numberToWords(350)).toBe('trezentos e cinquenta reais');
    });

    it('should handle thousands', () => {
      expect(numberToWords(1000)).toBe('mil reais');
    });

    it('should handle thousands with remainder', () => {
      expect(numberToWords(1500)).toBe('mil e quinhentos reais');
    });

    it('should handle large thousands', () => {
      expect(numberToWords(12500)).toBe('doze mil e quinhentos reais');
    });

    it('should handle millions', () => {
      expect(numberToWords(1000000)).toBe('um milhão reais');
    });

    it('should handle millions with thousands', () => {
      expect(numberToWords(1500000)).toBe('um milhão, quinhentos mil reais');
    });

    it('should handle only cents', () => {
      expect(numberToWords(0.5)).toBe('50 centavos');
    });

    it('should handle reais with cents', () => {
      const result = numberToWords(100.5);
      expect(result).toContain('cem reais');
      expect(result).toContain('centavo');
    });

    it('should handle 999', () => {
      expect(numberToWords(999)).toBe('novecentos e noventa e nove reais');
    });
  });
});
