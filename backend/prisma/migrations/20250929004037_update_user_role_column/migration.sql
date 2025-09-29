-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'user';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'roles'
  ) THEN
    UPDATE "users"
    SET "role" = COALESCE(NULLIF(roles[1], ''), 'user')
    WHERE "role" IS NULL OR "role" = 'user';

    ALTER TABLE "users" DROP COLUMN "roles";
  END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
