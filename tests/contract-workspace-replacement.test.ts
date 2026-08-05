import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(
  path.join(process.cwd(), "app/admin/packages/[id]/contract/page.tsx"),
  "utf8"
);

test("contract workspace offers a corrected version from archived signed history", () => {
  assert.match(source, /const latestArchivedVoidContract = archivedVoidContracts\[0\]/);
  assert.match(source, /name="replacementFromContractId" value=\{latestArchivedVoidContract\.id\}/);
  assert.match(source, /Create corrected first-purchase contract/);
});

test("corrected first-purchase flow preserves the original flow instead of becoming a renewal top-up", () => {
  assert.match(source, /name="flowType" value=\{latestArchivedVoidContract\.flowType\}/);
  assert.doesNotMatch(
    source.match(/\{latestArchivedVoidContract \? \([\s\S]*?\) : null\}/)?.[0] ?? "",
    /name="flowType" value="RENEWAL"/
  );
});
