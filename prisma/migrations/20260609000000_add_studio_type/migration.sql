-- CreateEnum
CREATE TYPE "StudioType" AS ENUM ('ACADEMIA', 'PERSONAL_EXTERNO');

-- AlterTable
ALTER TABLE "studios" ADD COLUMN "studio_type" "StudioType" NOT NULL DEFAULT 'ACADEMIA';
