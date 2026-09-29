CREATE TABLE "PackageEntitlementCorrection" (
 "id" TEXT NOT NULL,
 "packageId" TEXT NOT NULL,
 "sourceTxnId" TEXT NOT NULL,
 "adjustmentTxnId" TEXT NOT NULL,
 "requestKey" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL,
 "sourceFingerprint" TEXT NOT NULL,
 "sourceUnits" INTEGER NOT NULL,
 "beforeTotal" INTEGER NOT NULL,
 "afterTotal" INTEGER NOT NULL,
 "beforeBalance" INTEGER NOT NULL,
 "afterBalance" INTEGER NOT NULL,
 "deltaUnits" INTEGER NOT NULL,
 "reason" TEXT NOT NULL,
 "evidence" TEXT NOT NULL,
 "actorUserId" TEXT NOT NULL,
 "actorEmail" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PackageEntitlementCorrection_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "PackageEntitlementCorrection_valid_delta" CHECK ("deltaUnits" < 0 AND "afterTotal" >= 0 AND "afterBalance" >= 0 AND "sourceUnits" > 0 AND "afterTotal" = "beforeTotal" + "deltaUnits" AND "afterBalance" = "beforeBalance" + "deltaUnits")
);
CREATE UNIQUE INDEX "PackageEntitlementCorrection_adjustmentTxnId_key" ON "PackageEntitlementCorrection"("adjustmentTxnId");
CREATE UNIQUE INDEX "PackageEntitlementCorrection_requestKey_key" ON "PackageEntitlementCorrection"("requestKey");
CREATE INDEX "PackageEntitlementCorrection_packageId_createdAt_idx" ON "PackageEntitlementCorrection"("packageId","createdAt");
CREATE INDEX "PackageEntitlementCorrection_sourceTxnId_idx" ON "PackageEntitlementCorrection"("sourceTxnId");
ALTER TABLE "PackageEntitlementCorrection" ADD CONSTRAINT "PackageEntitlementCorrection_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PackageEntitlementCorrection" ADD CONSTRAINT "PackageEntitlementCorrection_sourceTxnId_fkey" FOREIGN KEY ("sourceTxnId") REFERENCES "PackageTxn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PackageEntitlementCorrection" ADD CONSTRAINT "PackageEntitlementCorrection_adjustmentTxnId_fkey" FOREIGN KEY ("adjustmentTxnId") REFERENCES "PackageTxn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
