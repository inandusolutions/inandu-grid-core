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

  it('is a plain page: printing is added when it is opened', () => {
    expect(buildPrintHtml('t', [], [])).not.toContain('<script');
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
    const page = (create.mock.calls[0] as unknown as [Blob])[0];
    expect(page.type).toContain('text/html');
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(revoke).toHaveBeenCalledWith('blob:x');
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('adds the auto-print script before </body>, once, and can be told not to', async () => {
    let seen: Blob | undefined;
    vi.stubGlobal('URL', { createObjectURL: (b: Blob) => ((seen = b), 'blob:x'), revokeObjectURL: vi.fn() });
    vi.spyOn(window, 'open').mockReturnValue(null);

    printHtmlDocument('<html><body><p>hi</p></body></html>');
    const html = await seen!.text();
    expect(html).toContain('print()');
    expect(html.indexOf('<script')).toBeLessThan(html.indexOf('</body>'));
    expect(html.match(/<script/g)).toHaveLength(1);

    printHtmlDocument('<p>fragment</p>', { autoPrint: false });
    expect(await seen!.text()).toBe('<p>fragment</p>');
    printHtmlDocument('<p>no body tag</p>');
    expect(await seen!.text()).toContain('print()');
    vi.unstubAllGlobals();
  });
});
