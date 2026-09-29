ALTER TABLE "PackageEntitlementCorrection" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'MINUTES';
ALTER TABLE "PackageEntitlementCorrection" ADD CONSTRAINT "PackageEntitlementCorrection_valid_unit" CHECK ("unit" IN ('MINUTES','COUNT'));
