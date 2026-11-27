import type {
  NetworkStore,
  NetworkNode,
  NetworkEdge,
} from "./sales-network-types";
export function activeNetwork(
  store: NetworkStore,
  includeArchived = false,
): NetworkStore {
  const nodes = store.nodes.filter((n) => includeArchived || !n.archived),
    ids = new Set(nodes.map((n) => n.id));
  return {
    ...store,
    nodes,
    edges: store.edges.filter(
      (e) =>
        (includeArchived || !e.archived) && ids.has(e.from) && ids.has(e.to),
    ),
  };
}
export function networkBounds(store: NetworkStore) {
  return {
    width: Math.max(1690, ...store.nodes.map((n) => n.x + 320)),
    height: Math.max(1650, ...store.nodes.map((n) => n.y + 160)),
  };
}
/** A cross-link never overrides an existing primary parent. Pipeline is a grouping, not a chain. */
export function organizeNetwork(store: NetworkStore) {
  const active = activeNetwork(store),
    root = active.nodes.find((n) => n.kind === "ROOT");
  if (!root) return;
  const pipeline = new Set(
    active.edges.filter((e) => e.style === "PIPELINE").map((e) => e.to),
  );
  const parents = new Map<string, string>(),
    children = new Map<string, NetworkNode[]>();
  for (const e of active.edges) {
    if (
      e.style === "PIPELINE" ||
      e.to === root.id ||
      pipeline.has(e.to) ||
      parents.has(e.to)
    )
      continue;
    let p: string | undefined = e.from;
    const seen = new Set<string>();
    while (p && !seen.has(p) && p !== e.to) {
      seen.add(p);
      p = parents.get(p);
    }
    if (p === e.to) continue;
    parents.set(e.to, e.from);
  }
  for (const n of active.nodes) {
    if (n.id === root.id || pipeline.has(n.id)) continue;
    const parent = parents.get(n.id) ?? root.id;
    children.set(parent, [...(children.get(parent) ?? []), n]);
  }
  let cursor = 30;
  const placed = new Set<string>();
  function place(node: NetworkNode, depth: number): number {
    if (placed.has(node.id)) return node.y;
    placed.add(node.id);
    node.x = 30 + 340 * depth;
    const ys = (children.get(node.id) ?? [])
      .filter((n) => !placed.has(n.id))
      .map((n) => place(n, depth + 1));
    node.y = ys.length ? (ys[0] + ys[ys.length - 1]) / 2 : cursor;
    if (!ys.length) cursor += 110;
    return node.y;
  }
  place(root, 0);
  const bottom = cursor + 140;
  cursor = bottom + 120;
  [...pipeline].forEach((id, i) => {
    const node = active.nodes.find((n) => n.id === id);
    if (node) {
      node.x = 350 + i * 340;
      node.y = bottom;
      placed.add(id);
      (children.get(id) ?? []).forEach((child) =>
        place(child, Math.round((node.x - 30) / 340) + 1),
      );
    }
  });
  for (const node of active.nodes) if (!placed.has(node.id)) place(node, 1);
}
export function connectionWouldCycle(
  store: NetworkStore,
  from: string,
  to: string,
) {
  const seen = new Set([to]),
    queue = [to];
  while (queue.length) {
    const id = queue.shift()!;
    if (id === from) return true;
    for (const edge of store.edges)
      if (!edge.archived && edge.from === id && !seen.has(edge.to)) {
        seen.add(edge.to);
        queue.push(edge.to);
      }
  }
  return false;
}
