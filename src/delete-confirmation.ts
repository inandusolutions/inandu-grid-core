import type { InanduGridRow } from './types';

/** What decides a delete: the app's own answer (sync or async), or a message for the browser's `window.confirm()`. */
export interface DeleteConfirmationOptions {
  /** The app's own answer. Set, it replaces `message`. A rejection or a throw counts as not confirmed. */
  confirmDelete?: (rows: InanduGridRow[]) => boolean | Promise<boolean>;
  /** Asked with `ask` (by default `window.confirm`) when there is no `confirmDelete`. Unset or empty: no question, the delete goes ahead. */
  message?: string;
  /** How to ask `message`; by default `window.confirm` when there is a window. Without one (server rendering) nothing can be asked, so nothing is deleted. */
  ask?: (message: string) => boolean;
}

export interface DeleteConfirmation {
  /**
   * Runs `proceed` once the delete of `rows` is confirmed, by `confirmDelete` if set, else by asking `message`, else at once. It stays
   * synchronous unless `confirmDelete` returns a promise. A second call while a promise is pending does nothing (a double click must
   * not open two dialogs). A throw or a rejection is logged with `console.error` and counts as not confirmed.
   */
  run(options: DeleteConfirmationOptions, rows: InanduGridRow[], proceed: () => void): void;
}

/**
 * The confirmation step of a row delete or a bulk delete, the same in every grid. One per grid: it remembers whether an answer is
 * still pending.
 */
export function createDeleteConfirmation(): DeleteConfirmation {
  let pending = false;
  return {
    run(options, rows, proceed) {
      const { confirmDelete, message } = options;
      if (!confirmDelete) {
        if (message) {
          const ask = options.ask ?? (typeof window !== 'undefined' && typeof window.confirm === 'function' ? (text: string) => window.confirm(text) : undefined);
          if (!ask || !ask(message)) return;
        }
        proceed();
        return;
      }
      if (pending) return;
      let answer: boolean | Promise<boolean>;
      try {
        answer = confirmDelete(rows);
      } catch (error) {
        console.error('inandu-grid: confirmDelete threw; the delete was not confirmed.', error);
        return;
      }
      if (typeof answer === 'boolean') {
        if (answer) proceed();
        return;
      }
      pending = true;
      answer.then(
        confirmed => {
          pending = false;
          if (confirmed) proceed();
        },
        (error: unknown) => {
          pending = false;
          console.error('inandu-grid: confirmDelete rejected; the delete was not confirmed.', error);
        },
      );
    },
  };
}
