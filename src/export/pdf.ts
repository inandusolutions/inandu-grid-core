/**
 * The one thing `truncatePdfText` needs from a PDF document: the rendered width of a string in its current font. A `jsPDF`
 * instance satisfies it, and so does any stand-in. It is declared here instead of importing `jsPDF` so the published
 * declarations never reference `jspdf` (an optional peer of the grids, not of this package).
 */
export interface PdfTextMeasurer {
  getTextWidth(text: string): number;
}

/**
 * Shortens `text` with a trailing "…" until it fits `maxWidth` (in the PDF's current font), unchanged if it already fits.
 * Finds the cut with a binary search (the width of a prefix only grows with its length), so a long cell costs
 * O(log n) width measurements instead of one per removed character.
 */
export function truncatePdfText(doc: PdfTextMeasurer, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) {
    return text;
  }
  let low = 0; // the longest prefix known to fit (the empty prefix + "…" is the floor)
  let high = text.length; // exclusive: the full text is known not to fit
  while (low < high - 1) {
    const mid = (low + high) >> 1;
    if (doc.getTextWidth(text.slice(0, mid) + '…') <= maxWidth) low = mid;
    else high = mid;
  }
  // The search counts UTF-16 units, so the cut can land between the two halves of a character such as an emoji. Back off by one: a
  // lone surrogate is not valid text and shows up as a replacement mark or a gap in the PDF.
  if (low > 0 && isHighSurrogate(text.charCodeAt(low - 1)) && isLowSurrogate(text.charCodeAt(low))) {
    low -= 1;
  }
  return text.slice(0, low) + '…';
}

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;
