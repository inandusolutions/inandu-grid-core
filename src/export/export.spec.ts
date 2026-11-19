import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob, escapeMarkup, truncatePdfText } from '../index';
import type { PdfTextMeasurer } from '../index';

describe('downloadBlob', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('keeps the object URL alive after the click and revokes it later', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:test');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadBlob('a,b', 'data.csv', 'text/csv');

    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).not.toHaveBeenCalled(); // not synchronously: some browsers would cancel the download
    expect(document.querySelector('a[download="data.csv"]')).not.toBeNull(); // attached while it is clicked

    vi.advanceTimersByTime(1000);

    expect(revoke).toHaveBeenCalledWith('blob:test');
    expect(document.querySelector('a[download="data.csv"]')).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('escapeMarkup', () => {
  it('still escapes & < >', () => {
    expect(escapeMarkup('a & b <c>')).toBe('a &amp; b &lt;c&gt;');
  });

  it('drops the control characters XML 1.0 cannot carry, and keeps tab, line feed and carriage return', () => {
    expect(escapeMarkup('a\u0000b\u0008c\u000Bd\u000Ce\u001Ff￾g')).toBe('abcdefg');
    expect(escapeMarkup('a\tb\nc\rd')).toBe('a\tb\nc\rd');
  });
});

describe('truncatePdfText', () => {
  // 10 units per character, "…" included.
  const doc = { getTextWidth: vi.fn((t: string) => t.length * 10) } satisfies PdfTextMeasurer;
  const widthCalls = () => (doc.getTextWidth as ReturnType<typeof vi.fn>).mock.calls.length;

  it('returns text that fits unchanged', () => {
    expect(truncatePdfText(doc, 'short', 100)).toBe('short');
  });

  it('cuts to the longest prefix that fits with the ellipsis', () => {
    // 50 units: 4 characters + "…"
    expect(truncatePdfText(doc, 'abcdefghij', 50)).toBe('abcd…');
  });

  it('returns just the ellipsis when nothing fits', () => {
    expect(truncatePdfText(doc, 'abcdefghij', 5)).toBe('…');
  });

  it('measures O(log n) times, not once per removed character', () => {
    (doc.getTextWidth as ReturnType<typeof vi.fn>).mockClear();
    const long = 'x'.repeat(5000);
    expect(truncatePdfText(doc, long, 100)).toBe('xxxxxxxxx…');
    expect(widthCalls()).toBeLessThan(30);
  });
});

describe('escapeMarkup: Unicode', () => {
  it('keeps text that is valid in XML: accents, CJK, right-to-left, and emoji (surrogate pairs)', () => {
    expect(escapeMarkup('Ñandú 日本語 العربية 🚀')).toBe('Ñandú 日本語 العربية 🚀');
  });

  it('drops U+FFFE and U+FFFF, which XML cannot carry, and keeps their neighbours', () => {
    expect(escapeMarkup('a\uFFFEb\uFFFFc')).toBe('abc');
  });

  it('escapes markup and still keeps Unicode around it', () => {
    expect(escapeMarkup('<日本語 & 🚀>')).toBe('&lt;日本語 &amp; 🚀&gt;');
  });
});

describe('truncatePdfText: characters made of two UTF-16 units', () => {
  // 10 units per UTF-16 code unit, "…" included, as the stand-in in the block above.
  const doc = { getTextWidth: (t: string) => t.length * 10 } satisfies PdfTextMeasurer;
  const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

  it('never cuts an emoji in half, wherever the cut falls', () => {
    const text = '🚀'.repeat(20);
    for (let width = 10; width <= 400; width += 10) {
      const out = truncatePdfText(doc, text, width);
      expect(lone.test(out)).toBe(false);
      expect(doc.getTextWidth(out)).toBeLessThanOrEqual(width);
    }
  });

  it('cuts text that mixes ASCII and emoji at a character boundary', () => {
    const out = truncatePdfText(doc, 'ab🚀cd🚀ef', 50); // 4 units + "…": would be "ab🚀" plus half of the next one
    expect(lone.test(out)).toBe(false);
    expect(out.endsWith('…')).toBe(true);
  });
});
