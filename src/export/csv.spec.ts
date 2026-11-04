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
