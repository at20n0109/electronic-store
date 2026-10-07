-- Add ZaloPay, bank transfer and COD as supported payment providers.
ALTER TYPE "PaymentProvider" ADD VALUE 'ZALOPAY';
ALTER TYPE "PaymentProvider" ADD VALUE 'BANK';
ALTER TYPE "PaymentProvider" ADD VALUE 'COD';