ALTER TABLE "Session" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

UPDATE "Session"
SET "lastSeenAt" = "createdAt";

ALTER TABLE "Session"
ALTER COLUMN "lastSeenAt" SET NOT NULL;

ALTER TABLE "Session"
ALTER COLUMN "lastSeenAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Session_lastSeenAt_idx" ON "Session"("lastSeenAt");
