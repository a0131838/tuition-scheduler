import assert from "node:assert/strict";
import test from "node:test";
import { resolveTransportInvoiceContext } from "../lib/transport-billing";

const jason = { id: "student-jason", name: "陈俊浩（Jason）" };
const johnPackage = {
  id: "package-john",
  studentId: "student-john",
  student: { id: "student-john", name: "陈祺浩 John" },
  course: { id: "course-english", name: "英语口语-双语教学" },
};

function fakeDb(input: {
  exactPackage?: typeof johnPackage | null;
  directPackage?: typeof johnPackage | null;
  sharedPackage?: typeof johnPackage | null;
}) {
  let packageLookup = 0;
  return {
    student: {
      findUnique: async () => jason,
    },
    coursePackage: {
      findFirst: async () => {
        packageLookup += 1;
        return packageLookup === 1 ? input.exactPackage ?? input.directPackage ?? null : input.directPackage ?? null;
      },
    },
    coursePackageSharedStudent: {
      findFirst: async () => input.sharedPackage ? { package: input.sharedPackage } : null,
    },
  };
}

test("transport billing uses the attendance package when the student is a shared package member", async () => {
  const context = await resolveTransportInvoiceContext(fakeDb({ exactPackage: johnPackage }) as any, {
    studentId: jason.id,
    attendancePackageIds: [johnPackage.id, johnPackage.id],
  });

  assert.deepEqual(context, {
    packageId: johnPackage.id,
    packageOwnerId: "student-john",
    packageOwnerName: "陈祺浩 John",
    studentId: jason.id,
    studentName: jason.name,
    courseName: "英语口语-双语教学",
    relationship: "SHARED",
  });
});

test("shared package context keeps the invoice student separate from the package owner", async () => {
  const context = await resolveTransportInvoiceContext(fakeDb({ exactPackage: johnPackage }) as any, {
    studentId: jason.id,
    attendancePackageIds: [johnPackage.id],
  });

  assert.equal(context.studentName, "陈俊浩（Jason）");
  assert.equal(context.packageOwnerName, "陈祺浩 John");
  assert.notEqual(context.studentId, context.packageOwnerId);
});

test("legacy attendance without a package id falls back to a shared package", async () => {
  const context = await resolveTransportInvoiceContext(
    fakeDb({ directPackage: null, sharedPackage: johnPackage }) as any,
    { studentId: jason.id, attendancePackageIds: [null] },
  );

  assert.equal(context.packageId, johnPackage.id);
  assert.equal(context.relationship, "SHARED");
});

test("transport billing rejects one invoice spanning multiple package contexts", async () => {
  await assert.rejects(
    () => resolveTransportInvoiceContext(fakeDb({ exactPackage: johnPackage }) as any, {
      studentId: jason.id,
      attendancePackageIds: ["package-one", "package-two"],
    }),
    /multiple packages/,
  );
});

test("transport billing rejects an attendance package that is not owned or shared by the student", async () => {
  await assert.rejects(
    () => resolveTransportInvoiceContext(fakeDb({ exactPackage: null }) as any, {
      studentId: jason.id,
      attendancePackageIds: ["unrelated-package"],
    }),
    /not owned or shared/,
  );
});
