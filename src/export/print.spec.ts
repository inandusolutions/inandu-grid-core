import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPrintHtml, printHtmlDocument } from './print';

describe('buildPrintHtml', () => {
  it('escapes the title, the headers and the cells', () => {
    const html = buildPrintHtml('<b>t</b>', ['<h>'], [['a & b', '<script>x</script>']]);
    expect(html).toContain('<title>&lt;b&gt;t&lt;/b&gt;</title>');
    expect(html).toContain('<th>&lt;h&gt;</th>');
    expect(html).toContain('<td>a &amp; b</td>');
    expect(html).toContain('<td>&lt;script&gt;x&lt;/script&gt;</td>');
  });

  it('prints itself when it has loaded', () => {
    expect(buildPrintHtml('t', [], [])).toContain('print()');
  });
});

describe('printHtmlDocument', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens a blob URL with noopener and releases it later', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    printHtmlDocument('<p>hi</p>');

    expect(create).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith('blob:x', '_blank', 'noopener');
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(revoke).toHaveBeenCalledWith('blob:x');
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
