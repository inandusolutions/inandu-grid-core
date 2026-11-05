import { describe, expect, it } from 'vitest';
import * as core from './index';
import { en, es, fr, it as itLang, zh, INANDU_GRID_TRANSLATIONS } from './index';

// The README lists what the package exports. If an export is renamed or dropped this fails, and the README has
// to be updated on purpose.
const DOCUMENTED = [
  'formatCellValue',
  'formatDateValue',
  'coerceToDate',
  'defaultNumberFormatter',
  'matchesColumnFilter',
  'hasMeaningfulFilterValue',
  'compareCellValues',
  'flattenTree',
  'collectTreeRows',
  'computeGroupAggregates',
  'AGGREGATE_SYMBOLS',
  'parseDraftValue',
  'parsePastedCellValue',
  'parsePastedCell',
  'escapeCsvValue',
  'neutralizeCsvFormula',
  'escapeMarkup',
  'buildPrintHtml',
  'printHtmlDocument',
  'truncatePdfText',
  'downloadBlob',
  'en',
  'es',
  'fr',
  'it',
  'zh',
  'INANDU_GRID_TRANSLATIONS',
];

describe('public exports', () => {
  it.each(DOCUMENTED)('exports %s', name => {
    expect((core as Record<string, unknown>)[name]).toBeDefined();
  });
});

describe('translations', () => {
  const languages = { es, fr, it: itLang, zh };
  const keys = Object.keys(en).sort();

  it.each(Object.entries(languages))('%s has exactly the keys of en', (_name, dictionary) => {
    expect(Object.keys(dictionary).sort()).toEqual(keys);
  });

  it.each(Object.entries({ en, ...languages }))('%s has no empty message', (_name, dictionary) => {
    for (const [key, message] of Object.entries(dictionary)) {
      expect(message.trim(), key).not.toBe('');
    }
  });

  it.each(Object.entries(languages))('%s keeps the placeholders of en', (_name, dictionary) => {
    const placeholders = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map(p => p.replace(/\s/g, '')).sort();
    for (const key of keys) {
      expect(placeholders((dictionary as Record<string, string>)[key]), key).toEqual(placeholders((en as Record<string, string>)[key]));
    }
  });

  it('INANDU_GRID_TRANSLATIONS maps every language', () => {
    expect(Object.keys(INANDU_GRID_TRANSLATIONS).sort()).toEqual(['en', 'es', 'fr', 'it', 'zh']);
  });
});
