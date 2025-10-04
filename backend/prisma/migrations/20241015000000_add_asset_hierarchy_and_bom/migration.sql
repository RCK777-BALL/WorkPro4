-- Create tables for the asset hierarchy
CREATE TABLE IF NOT EXISTS "sites" (
  "_id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "areas" (
  "_id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "lines" (
  "_id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "area_id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "stations" (
  "_id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "line_id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "asset_bom_items" (
  "_id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "asset_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "reference" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION,
  "unit" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Asset hierarchy foreign keys
ALTER TABLE "areas"
  ADD CONSTRAINT "areas_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("_id") ON DELETE CASCADE;

ALTER TABLE "lines"
  ADD CONSTRAINT "lines_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("_id") ON DELETE CASCADE;

ALTER TABLE "stations"
  ADD CONSTRAINT "stations_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "lines"("_id") ON DELETE CASCADE;

ALTER TABLE "asset_bom_items"
  ADD CONSTRAINT "asset_bom_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("_id") ON DELETE CASCADE;

-- Extend assets with lifecycle metadata
ALTER TABLE "assets"
  ADD COLUMN IF NOT EXISTS "area_id" TEXT,
  ADD COLUMN IF NOT EXISTS "station_id" TEXT,
  ADD COLUMN IF NOT EXISTS "criticality" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "manufacturer" TEXT,
  ADD COLUMN IF NOT EXISTS "model_number" TEXT,
  ADD COLUMN IF NOT EXISTS "serial_number" TEXT,
  ADD COLUMN IF NOT EXISTS "commissioned_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "warranty_provider" TEXT,
  ADD COLUMN IF NOT EXISTS "warranty_contact" TEXT,
  ADD COLUMN IF NOT EXISTS "warranty_expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "warranty_notes" TEXT;

-- Asset relations to hierarchy tables
ALTER TABLE "assets"
  ADD CONSTRAINT IF NOT EXISTS "assets_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("_id") ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS "assets_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("_id") ON DELETE SET NULL;

-- Indexes and unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "sites_tenant_code_key" ON "sites" ("tenant_id", "code") WHERE "code" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "sites_tenant_id_idx" ON "sites" ("tenant_id");

CREATE UNIQUE INDEX IF NOT EXISTS "areas_site_code_key" ON "areas" ("tenant_id", "site_id", "code") WHERE "code" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "areas_tenant_id_idx" ON "areas" ("tenant_id");
CREATE INDEX IF NOT EXISTS "areas_site_id_idx" ON "areas" ("site_id");

CREATE UNIQUE INDEX IF NOT EXISTS "lines_area_code_key" ON "lines" ("tenant_id", "area_id", "code") WHERE "code" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "lines_tenant_id_idx" ON "lines" ("tenant_id");
CREATE INDEX IF NOT EXISTS "lines_area_id_idx" ON "lines" ("area_id");

CREATE UNIQUE INDEX IF NOT EXISTS "stations_line_code_key" ON "stations" ("tenant_id", "line_id", "code") WHERE "code" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "stations_tenant_id_idx" ON "stations" ("tenant_id");
CREATE INDEX IF NOT EXISTS "stations_line_id_idx" ON "stations" ("line_id");

CREATE INDEX IF NOT EXISTS "asset_bom_items_asset_id_idx" ON "asset_bom_items" ("asset_id");
CREATE INDEX IF NOT EXISTS "asset_bom_tenant_asset_idx" ON "asset_bom_items" ("tenant_id", "asset_id");

CREATE INDEX IF NOT EXISTS "assets_tenant_station_idx" ON "assets" ("tenant_id", "station_id");
CREATE INDEX IF NOT EXISTS "assets_tenant_area_idx" ON "assets" ("tenant_id", "area_id");
CREATE UNIQUE INDEX IF NOT EXISTS "assets_tenant_code_key" ON "assets" ("tenant_id", "code");
