-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'MOCK';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "clientSecret" TEXT;
