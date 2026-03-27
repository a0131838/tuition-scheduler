import assert from "node:assert/strict";
import test from "node:test";
import {
  AppSettingConflictError,
  loadJsonAppSettingForDb,
  mutateJsonAppSettingForDb,
  saveJsonAppSettingForDb,
} from "../lib/app-setting-lock";

test("saveJsonAppSettingForDb uses updatedAt conditional update", async () => {
  const expectedUpdatedAt = new Date("2026-03-26T10:00:00.000Z");
  const nextUpdatedAt = new Date("2026-03-26T10:00:01.000Z");
  const calls: Array<unknown> = [];
  const db = {
    appSetting: {
      async findUnique() {
        return { key: "k", value: "{\"ok\":true}", updatedAt: nextUpdatedAt };
      },
      async create() {
        throw new Error("should not create");
      },
      async updateMany(args: unknown) {
        calls.push(args);
        return { count: 1 };
      },
    },
  };

  const updatedAt = await saveJsonAppSettingForDb(db as any, "k", { ok: true }, expectedUpdatedAt);

  assert.equal(updatedAt.toISOString(), nextUpdatedAt.toISOString());
  assert.deepEqual(calls[0], {
    where: { key: "k", updatedAt: expectedUpdatedAt },
    data: { value: "{\"ok\":true}" },
  });
});

test("mutateJsonAppSettingForDb retries once on optimistic-lock conflict", async () => {
  let findCount = 0;
  let updateCount = 0;
  const db = {
    appSetting: {
      async findUnique() {
        findCount += 1;
        return {
          key: "k",
          value: findCount === 1 ? "{\"items\":[\"a\"]}" : "{\"items\":[\"a\",\"b\"]}",
          updatedAt: new Date(findCount === 1 ? "2026-03-26T10:00:00.000Z" : "2026-03-26T10:00:01.000Z"),
        };
      },
      async create() {
        throw new Error("should not create");
      },
      async updateMany() {
        updateCount += 1;
        return { count: updateCount === 1 ? 0 : 1 };
      },
    },
  };

  const result = await mutateJsonAppSettingForDb(db as any, {
    key: "k",
    fallback: { items: [] as string[] },
    sanitize: (input) => input as { items: string[] },
    mutate(store) {
      store.items.push("c");
    },
  });

  assert.deepEqual(result, { items: ["a", "b", "c"] });
  assert.equal(updateCount, 2);
});

test("loadJsonAppSettingForDb falls back on invalid json", async () => {
  const loaded = await loadJsonAppSettingForDb(
    {
      appSetting: {
        async findUnique() {
          return { key: "k", value: "{bad json", updatedAt: new Date("2026-03-26T10:00:00.000Z") };
        },
        async create() {
          throw new Error("unused");
        },
        async updateMany() {
          throw new Error("unused");
        },
      },
    } as any,
    "k",
    { items: [] as string[] },
    (input) => input as { items: string[] },
  );

  assert.deepEqual(loaded.store, { items: [] });
});

test("mutateJsonAppSettingForDb throws conflict after retry budget is exhausted", async () => {
  const db = {
    appSetting: {
      async findUnique() {
        return {
          key: "k",
          value: "{\"items\":[]}",
          updatedAt: new Date("2026-03-26T10:00:00.000Z"),
        };
      },
      async create() {
        throw new Error("should not create");
      },
      async updateMany() {
        return { count: 0 };
      },
    },
  };

  await assert.rejects(
    () =>
      mutateJsonAppSettingForDb(db as any, {
        key: "k",
        fallback: { items: [] as string[] },
        sanitize: (input) => input as { items: string[] },
        mutate(store) {
          store.items.push("x");
        },
        maxRetries: 1,
      }),
    (error: unknown) => error instanceof AppSettingConflictError,
  );
});
