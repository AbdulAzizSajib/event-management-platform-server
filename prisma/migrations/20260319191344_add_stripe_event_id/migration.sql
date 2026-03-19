/*
  Warnings:

  - A unique constraint covering the columns `[stripeEventId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'STRIPE';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "stripeEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeEventId_key" ON "payments"("stripeEventId");
