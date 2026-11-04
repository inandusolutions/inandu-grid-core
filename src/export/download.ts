/** How long the object URL stays valid after the click. Revoking it right away makes some browsers (older Firefox and Safari) cancel the download. */
const REVOKE_DELAY_MS = 1000;

/** Triggers a browser download of `content` as `filename`, via a throwaway object URL + `<a>` click. */
export function downloadBlob(content: string | Blob, filename: string, mimeType?: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  // Attached while it is clicked: a detached anchor is not honoured by every browser.
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, REVOKE_DELAY_MS);
}
