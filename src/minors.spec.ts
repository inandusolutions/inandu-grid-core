import { describe, expect, it } from 'vitest';
import { collectTreeRows, compareCellValues, defaultNumberFormatter, flattenTree, formatCellValue } from './index';

describe('formatCellValue: boolean labels', () => {
  it('uses both labels of "truthy|falsy"', () => {
    expect(formatCellValue(true, 'boolean', 'Yes|No', 'en')).toBe('Yes');
    expect(formatCellValue(false, 'boolean', 'Yes|No', 'en')).toBe('No');
  });
  it('labels only the truthy side when there is no "|", and never prints "undefined"', () => {
    expect(formatCellValue(true, 'boolean', 'Yes', 'en')).toBe('Yes');
    expect(formatCellValue(false, 'boolean', 'Yes', 'en')).toBe('');
  });
  it('defaults to true|false', () => {
    expect(formatCellValue(false, 'boolean', '', 'en')).toBe('false');
  });
});

describe('defaultNumberFormatter: bad digitsInfo', () => {
  it('does not throw when min > max', () => {
    expect(() => defaultNumberFormatter(1.5, 'en-US', '1.5-2')).not.toThrow();
    expect(defaultNumberFormatter(1.5, 'en-US', '1.5-2')).toBe('1.50000');
  });
  it('does not throw when a digit count is past the limit', () => {
    expect(() => defaultNumberFormatter(1.5, 'en-US', '1.0-500')).not.toThrow();
    expect(() => defaultNumberFormatter(1.5, 'en-US', '99.0-2')).not.toThrow();
  });
  it('still formats a valid digitsInfo', () => {
    expect(defaultNumberFormatter(1234.5, 'en-US', '1.2-2')).toBe('1,234.50');
  });
});

describe('compareCellValues: values with no position', () => {
  it('sorts an invalid Date with the empty values instead of returning NaN', () => {
    const bad = new Date('garbage');
    const good = new Date(2024, 0, 1);
    expect(compareCellValues(bad, good)).toBe(-1);
    expect(compareCellValues(good, bad)).toBe(1);
    expect(compareCellValues(bad, bad)).toBe(0);
    expect(compareCellValues(null, bad)).toBe(0);
  });
  it('treats NaN like an empty value', () => {
    expect(compareCellValues(Number.NaN, 5)).toBe(-1);
  });
  it('is a consistent comparator over a mixed array', () => {
    const values = [new Date(2024, 5, 1), new Date('x'), new Date(2024, 1, 1), null, new Date('y')];
    const sorted = [...values].sort((a, b) => compareCellValues(a, b));
    expect(sorted.slice(0, 3).every(v => v === null || Number.isNaN((v as Date).getTime()))).toBe(true);
    expect((sorted[3] as Date).getMonth()).toBe(1);
    expect((sorted[4] as Date).getMonth()).toBe(5);
  });
});

interface Node {
  id: string;
  kids?: Node[];
}

describe('flattenTree and collectTreeRows: cyclic data', () => {
  const kidsOf = (n: Node) => n.kids;

  it('does not loop forever when a node is its own ancestor', () => {
    const a: Node = { id: 'a', kids: [] };
    const b: Node = { id: 'b', kids: [a] };
    a.kids!.push(b); // a -> b -> a
    const rows = flattenTree([a], { getChildren: kidsOf, isExpanded: () => true });
    expect(rows.map(r => r.row.id)).toEqual(['a', 'b']);
  });

  it('does not loop forever with a filter over cyclic data', () => {
    const a: Node = { id: 'a', kids: [] };
    const b: Node = { id: 'b', kids: [a] };
    a.kids!.push(b);
    const rows = flattenTree([a], { getChildren: kidsOf, isExpanded: () => true, match: n => n.id === 'zzz' });
    expect(rows).toEqual([]);
  });

  it('a node that is its own child is shown once', () => {
    const a: Node = { id: 'a', kids: [] };
    a.kids!.push(a);
    expect(flattenTree([a], { getChildren: kidsOf, isExpanded: () => true }).map(r => r.row.id)).toEqual(['a']);
  });

  it('collectTreeRows terminates on a cycle and lists a shared node once', () => {
    const a: Node = { id: 'a', kids: [] };
    const b: Node = { id: 'b', kids: [a] };
    a.kids!.push(b);
    expect(collectTreeRows([a], kidsOf).map(n => n.id)).toEqual(['a', 'b']);
  });

  it('an ordinary tree is unchanged', () => {
    const tree: Node[] = [{ id: 'r', kids: [{ id: 'c1' }, { id: 'c2', kids: [{ id: 'g' }] }] }];
    const rows = flattenTree(tree, { getChildren: kidsOf, isExpanded: () => true });
    expect(rows.map(r => `${r.depth}:${r.row.id}`)).toEqual(['0:r', '1:c1', '1:c2', '2:g']);
  });
});
