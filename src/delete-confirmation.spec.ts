import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDeleteConfirmation } from './index';
import type { InanduGridRow } from './index';

const rows: InanduGridRow[] = [{ id: 1 }, { id: 2 }];
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('createDeleteConfirmation', () => {
  it('goes ahead at once when there is nothing to ask', () => {
    const proceed = vi.fn();
    createDeleteConfirmation().run({}, rows, proceed);
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it('confirmDelete replaces the message, and a sync answer decides at once', () => {
    const ask = vi.fn(() => true);
    const proceed = vi.fn();
    const confirmation = createDeleteConfirmation();

    confirmation.run({ confirmDelete: () => false, message: 'Sure?', ask }, rows, proceed);
    expect(proceed).not.toHaveBeenCalled();
    confirmation.run({ confirmDelete: () => true, message: 'Sure?', ask }, rows, proceed);
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(ask).not.toHaveBeenCalled();
  });

  it('confirmDelete gets the rows', () => {
    const confirmDelete = vi.fn(() => true);
    createDeleteConfirmation().run({ confirmDelete }, rows, () => undefined);
    expect(confirmDelete).toHaveBeenCalledWith(rows);
  });

  it('waits for a promise and goes ahead only when it resolves to true', async () => {
    let resolve!: (value: boolean) => void;
    const proceed = vi.fn();
    createDeleteConfirmation().run({ confirmDelete: () => new Promise<boolean>(r => (resolve = r)) }, rows, proceed);

    expect(proceed).not.toHaveBeenCalled();
    resolve(true);
    await tick();
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it('a promise that resolves to false, a rejection and a throw do not delete; the last two are logged', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const proceed = vi.fn();
    const confirmation = createDeleteConfirmation();

    confirmation.run({ confirmDelete: () => Promise.resolve(false) }, rows, proceed);
    await tick();
    confirmation.run({ confirmDelete: () => Promise.reject(new Error('closed')) }, rows, proceed);
    await tick();
    confirmation.run({ confirmDelete: () => { throw new Error('boom'); } }, rows, proceed);

    expect(proceed).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it('a second call while an answer is pending does nothing, and works again once it is answered', async () => {
    const answers: ((value: boolean) => void)[] = [];
    const confirmDelete = vi.fn(() => new Promise<boolean>(r => answers.push(r)));
    const proceed = vi.fn();
    const confirmation = createDeleteConfirmation();

    confirmation.run({ confirmDelete }, rows, proceed);
    confirmation.run({ confirmDelete }, rows, proceed);
    expect(confirmDelete).toHaveBeenCalledTimes(1);

    answers[0](false);
    await tick();
    confirmation.run({ confirmDelete }, rows, proceed);
    expect(confirmDelete).toHaveBeenCalledTimes(2);
  });

  it('two grids do not share a pending answer', () => {
    const confirmDelete = vi.fn(() => new Promise<boolean>(() => undefined));
    createDeleteConfirmation().run({ confirmDelete }, rows, () => undefined);
    createDeleteConfirmation().run({ confirmDelete }, rows, () => undefined);
    expect(confirmDelete).toHaveBeenCalledTimes(2);
  });

  it('asks the message with window.confirm by default, and only goes ahead on yes', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const proceed = vi.fn();
    const confirmation = createDeleteConfirmation();

    confirmation.run({ message: 'Sure?' }, rows, proceed);
    expect(proceed).not.toHaveBeenCalled();
    confirmation.run({ message: 'Sure?' }, rows, proceed);
    expect(confirmSpy).toHaveBeenCalledWith('Sure?');
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it('a custom ask is used instead of window.confirm', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const proceed = vi.fn();
    createDeleteConfirmation().run({ message: 'Sure?', ask: () => true }, rows, proceed);
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('without a window (server rendering) a message cannot be asked, so nothing is deleted', () => {
    vi.stubGlobal('window', undefined);
    const proceed = vi.fn();
    createDeleteConfirmation().run({ message: 'Sure?' }, rows, proceed);
    expect(proceed).not.toHaveBeenCalled();
  });
});
