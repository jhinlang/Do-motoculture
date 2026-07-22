CREATE TYPE "StockReservationStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');

ALTER TABLE "Order"
  ADD COLUMN "stockReservationStatus" "StockReservationStatus" NOT NULL DEFAULT 'RESERVED',
  ADD COLUMN "reservationExpiresAt" TIMESTAMP(3);

UPDATE "Order"
SET "reservationExpiresAt" = "updatedAt",
    "stockReservationStatus" = CASE
  WHEN "paymentStatus" = 'PAID' THEN 'CONSUMED'::"StockReservationStatus"
  ELSE 'RELEASED'::"StockReservationStatus"
END;

ALTER TABLE "Order" ALTER COLUMN "reservationExpiresAt" SET NOT NULL;
CREATE INDEX "Order_stockReservationStatus_reservationExpiresAt_idx" ON "Order"("stockReservationStatus", "reservationExpiresAt");
