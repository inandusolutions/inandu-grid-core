import { describe, expect, it } from 'vitest';
import { escapeCsvValue, neutralizeCsvFormula } from '../index';

describe('escapeCsvValue: formula neutralization', () => {
  it.each(['=HYPERLINK("http://evil","click")', '=cmd|\' /C calc\'!A0', '+1+1', '-2+3', '@SUM(A1:A2)', '\t=1+1', '\r=1+1'])(
    'prefixes %j so a spreadsheet opens it as text',
    value => {
      expect(neutralizeCsvFormula(value)).toBe(`'${value}`);
      expect(escapeCsvValue(value).replace(/^"|"$/g, '').replace(/""/g, '"').startsWith("'")).toBe(true);
    },
  );

  it.each(['-5', '+34', '-1,234.50', '+34 600 000', '1e5', '-1.5e-3', '0'])('leaves the plain number %j alone', value => {
    expect(neutralizeCsvFormula(value)).toBe(value);
  });

  it('leaves ordinary text alone', () => {
    expect(escapeCsvValue('Alice')).toBe('Alice');
    expect(escapeCsvValue('a = b')).toBe('a = b');
    expect(escapeCsvValue('')).toBe('');
  });

  it('still quotes commas, quotes and line breaks, after neutralizing', () => {
    expect(escapeCsvValue('=A1,B1')).toBe('"\'=A1,B1"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue('a\nb')).toBe('"a\nb"');
  });

  it('can be turned off', () => {
    expect(escapeCsvValue('=1+1', { neutralizeFormulas: false })).toBe('=1+1');
  });
});

describe('escapeCsvValue: Unicode and awkward text (export fixtures)', () => {
  it.each(['Ñandú', '日本語', '🚀 launch', 'العربية', 'עברית', 'e\u0301 (a combining accent)', '\u202Eright-to-left override'])(
    'leaves %j alone: no quoting, no change',
    value => {
      expect(escapeCsvValue(value)).toBe(value);
    },
  );

  it('quotes a cell with a carriage return, a line feed or both, whatever the text around them', () => {
    expect(escapeCsvValue('日本\r\n語')).toBe('"日本\r\n語"');
    expect(escapeCsvValue('🚀\n🚀')).toBe('"🚀\n🚀"');
    expect(escapeCsvValue('a\rb')).toBe('"a\rb"');
  });

  it('neutralizes a formula that hides behind a line break, a tab or text in another script', () => {
    expect(escapeCsvValue('=日本語')).toBe("'=日本語");
    expect(escapeCsvValue('@🚀')).toBe("'@🚀");
    expect(neutralizeCsvFormula('-1-1')).toBe("'-1-1");
    expect(neutralizeCsvFormula('+1\t=1+1')).toBe("'+1\t=1+1");
  });

  it('keeps the quote doubling correct next to non-ASCII text', () => {
    expect(escapeCsvValue('"日本語", dijo')).toBe('"""日本語"", dijo"');
  });

  it('handles a very long cell without changing it', () => {
    const long = 'ñ'.repeat(100000);
    expect(escapeCsvValue(long)).toBe(long);
  });
});
