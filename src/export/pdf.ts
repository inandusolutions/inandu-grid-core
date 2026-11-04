import type { jsPDF } from 'jspdf';

/**
 * Shortens `text` with a trailing "…" until it fits `maxWidth` (in the PDF's current font), unchanged if it already fits.
 * Finds the cut with a binary search (the width of a prefix only grows with its length), so a long cell costs
 * O(log n) width measurements instead of one per removed character.
 */
export function truncatePdfText(doc: jsPDF, text: string, maxWidth: number): string {
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
  return text.slice(0, low) + '…';
}
