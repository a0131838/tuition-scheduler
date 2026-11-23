import test from "node:test";
import assert from "node:assert/strict";
import {
  reviewedNetwork,
  verifyNetworkPdf,
  GT_NETWORK_HASH,
  defaultCreateRelationship,
} from "../lib/sales-network-source";
import { validateNetworkStore } from "../lib/sales-network-types";
import { assertRelationshipWrite } from "../lib/sales-relationship-policy";
test("reviewed PDF graph preserves ambiguous identities and grouping semantics", () => {
  const graph = reviewedNetwork();
  assert.equal(graph.nodes.length, 30);
  assert.equal(graph.edges.length, 30);
  assert.equal(new Set(graph.nodes.map((n) => n.id)).size, graph.nodes.length);
  assert.equal(
    graph.nodes.filter((n) => n.name.startsWith("Wang Yuxuan")).length,
    2,
  );
  assert.equal(graph.nodes.filter((n) => n.kind === "GROUP").length, 2);
  assert.equal(graph.nodes.filter((n) => n.kind === "STUDENT").length, 0);
  assert.equal(graph.nodes.filter(defaultCreateRelationship).length, 10);
  assert.equal(graph.edges.filter((e) => e.style === "PIPELINE").length, 4);
  assert.ok(
    graph.edges
      .filter((e) => e.style === "PIPELINE")
      .every((e) => e.from === "jasmine"),
  );
  assert.ok(graph.edges.every((e) => !e.confirmed));
  assert.equal(graph.sourceHash, GT_NETWORK_HASH);
});
test("unknown PDFs and corrupted graph stores are rejected", () => {
  assert.throws(() =>
    verifyNetworkPdf(
      new TextEncoder().encode("%PDF not the supplied document"),
    ),
  );
  const store = reviewedNetwork();
  assert.equal(validateNetworkStore(store), store);
  assert.throws(() =>
    validateNetworkStore({ ...store, nodes: [...store.nodes, store.nodes[0]] }),
  );
  assert.throws(() =>
    validateNetworkStore({
      ...store,
      edges: [
        ...store.edges,
        { ...store.edges[0], id: "broken", to: "missing" },
      ],
    }),
  );
  assert.throws(() => validateNetworkStore({ ...store, revision: 0 }));
});
test("network mutations retain the resource workspace permission boundary", () => {
  for (const role of ["ADMIN", "SALES", "CS"])
    assert.doesNotThrow(() =>
      assertRelationshipWrite({ id: "x", name: "x", email: "x", role }),
    );
  for (const role of ["FINANCE", "TEACHER", "STUDENT"])
    assert.throws(() =>
      assertRelationshipWrite({ id: "x", name: "x", email: "x", role }),
    );
  assert.throws(() =>
    assertRelationshipWrite({
      id: "x",
      name: "x",
      email: "x",
      role: "ADMIN",
      isObserver: true,
    }),
  );
});

test("growing maps have dynamic bounds, stable identities and restorable archives", async () => {
  const {
    activeNetwork,
    networkBounds,
    organizeNetwork,
    connectionWouldCycle,
  } = await import("../lib/sales-network-layout");
  const graph = reviewedNetwork(),
    ids = graph.nodes.map((n) => n.id).sort();
  for (let i = 0; i < 8; i++) {
    graph.nodes.push({
      id: "new-" + i,
      name: "New institution " + i,
      kind: "INSTITUTION",
      x: 0,
      y: 0,
      sourceStatus: "",
      review: "pending",
      note: "",
      origin: "MANUAL",
    });
    graph.edges.push({
      id: "new-edge-" + i,
      from: "jasmine",
      to: "new-" + i,
      label: "discussion",
      style: "PIPELINE",
      confirmed: false,
    });
  }
  organizeNetwork(graph);
  const bounds = networkBounds(graph);
  assert.ok(bounds.width > 1690);
  assert.ok(
    graph.nodes.every(
      (n) =>
        n.x >= 0 &&
        n.y >= 0 &&
        n.x + 274 < bounds.width &&
        n.y + 104 < bounds.height,
    ),
  );
  assert.deepEqual(
    graph.nodes
      .filter((n) => !n.id.startsWith("new-"))
      .map((n) => n.id)
      .sort(),
    ids,
  );
  assert.ok(connectionWouldCycle(graph, "qihao", "nlcs"));
  assert.ok(!connectionWouldCycle(graph, "mdm-su", "felix"));
  graph.nodes.find((n) => n.id === "nlcs")!.archived = true;
  assert.ok(!activeNetwork(graph).nodes.some((n) => n.id === "nlcs"));
  assert.ok(
    !activeNetwork(graph).edges.some(
      (e) => e.from === "nlcs" || e.to === "nlcs",
    ),
  );
  assert.ok(activeNetwork(graph, true).nodes.some((n) => n.id === "nlcs"));
  graph.nodes.find((n) => n.id === "nlcs")!.archived = false;
  assert.ok(activeNetwork(graph).edges.some((e) => e.from === "nlcs"));
});
