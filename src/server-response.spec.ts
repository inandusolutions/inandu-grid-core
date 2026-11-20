import { describe, expect, it } from 'vitest';
import { parseServerResponse } from './index';

describe('parseServerResponse', () => {
  it('accepts { data, total }', () => {
    expect(parseServerResponse({ data: [{ id: 1 }], total: 7 })).toEqual({ data: [{ id: 1 }], total: 7 });
    expect(parseServerResponse({ data: [], total: 0 })).toEqual({ data: [], total: 0 });
  });

  it('takes a missing or null total to be the number of rows received', () => {
    expect(parseServerResponse({ data: [{ id: 1 }, { id: 2 }] })).toEqual({ data: [{ id: 1 }, { id: 2 }], total: 2 });
    expect(parseServerResponse({ data: [{ id: 1 }], total: null })).toEqual({ data: [{ id: 1 }], total: 1 });
  });

  it('throws an error that says what was wrong', () => {
    expect(() => parseServerResponse(null)).toThrowError(/got null/);
    expect(() => parseServerResponse(undefined)).toThrowError(/got undefined/);
    expect(() => parseServerResponse([1, 2])).toThrowError(/got an array/);
    expect(() => parseServerResponse('x')).toThrowError(/got string/);
    expect(() => parseServerResponse({})).toThrowError(/`data` to be an array, got nothing/);
    expect(() => parseServerResponse({ data: { a: 1 } })).toThrowError(/`data` to be an array, got object/);
    expect(() => parseServerResponse({ data: [], total: '5' })).toThrowError(/`total`.*"5"/);
    expect(() => parseServerResponse({ data: [], total: -1 })).toThrowError(/`total`/);
    expect(() => parseServerResponse({ data: [], total: NaN })).toThrowError(/`total`/);
    expect(() => parseServerResponse({ data: [], total: Infinity })).toThrowError(/`total`/);
  });
});
