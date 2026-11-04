/**
 * Tree-data flattening (#3) — pure, framework-agnostic. Walks a nested-children hierarchy into the
 * flat list of rows that should render right now: a node's children appear directly below it, but
 * only while that node is expanded. Filtering keeps a node when it (or any descendant) matches, and
 * force-expands the ancestors of a match so it's visible; an optional comparator sorts each level.
 */

export interface TreeVisibleRow<T> {
  row: T;
  /** 0 for a root, +1 per level. Drives the first cell's indentation. */
  depth: number;
  /** Has at least one (surviving) child — i.e. worth showing a toggle. */
  expandable: boolean;
  /** Currently showing its children. */
  expanded: boolean;
}

export interface FlattenTreeOptions<T> {
  /** A node's children array (or `undefined` / `[]` for a leaf). */
  getChildren: (row: T) => readonly T[] | undefined;
  /** Whether `row` is expanded — consulted only when there is no active `match`. */
  isExpanded: (row: T) => boolean;
  /** When set, a node survives iff it or a descendant returns `true`; matches render expanded. */
  match?: (row: T) => boolean;
  /** Sorts the siblings at every level (applied after filtering). */
  compare?: (a: T, b: T) => number;
}

export function flattenTree<T>(roots: readonly T[], options: FlattenTreeOptions<T>): TreeVisibleRow<T>[] {
  const { getChildren, isExpanded, match, compare } = options;
  const out: TreeVisibleRow<T>[] = [];

  // memoise the "self-or-descendant matches" test — a wide/deep tree would otherwise re-walk a lot
  const keepCache = new Map<T, boolean>();
  // Data with a cycle (a node that is its own descendant) must not recurse forever: a node already on the current
  // path is not walked again, here or below.
  const matching = new Set<T>();
  const keep = (row: T): boolean => {
    if (!match) return true;
    const cached = keepCache.get(row);
    if (cached !== undefined) return cached;
    if (matching.has(row)) return false;
    matching.add(row);
    let result = match(row);
    if (!result) {
      const kids = getChildren(row);
      result = !!kids && kids.some(keep);
    }
    matching.delete(row);
    keepCache.set(row, result);
    return result;
  };

  const path = new Set<T>();
  const walk = (level: readonly T[], depth: number): void => {
    let rows = match ? level.filter(keep) : [...level];
    rows = rows.filter(row => !path.has(row));
    if (compare) rows = rows.slice().sort(compare);
    for (const row of rows) {
      const rawChildren = getChildren(row)?.filter(child => child !== row && !path.has(child));
      const keptChildren = rawChildren ? (match ? rawChildren.filter(keep) : rawChildren) : [];
      const expandable = keptChildren.length > 0;
      const expanded = expandable && (match ? true : isExpanded(row));
      out.push({ row, depth, expandable, expanded });
      if (expanded) {
        path.add(row);
        walk(rawChildren!, depth + 1);
        path.delete(row);
      }
    }
  };

  walk(roots, 0);
  return out;
}

/** Every node in the hierarchy, depth-first — used for "expand all" / counting. */
export function collectTreeRows<T>(
  roots: readonly T[],
  getChildren: (row: T) => readonly T[] | undefined,
): T[] {
  const out: T[] = [];
  const seen = new Set<T>(); // a cycle must not recurse forever, and a shared node is listed once
  const walk = (level: readonly T[]): void => {
    for (const row of level) {
      if (seen.has(row)) continue;
      seen.add(row);
      out.push(row);
      const kids = getChildren(row);
      if (kids && kids.length) walk(kids);
    }
  };
  walk(roots);
  return out;
}
