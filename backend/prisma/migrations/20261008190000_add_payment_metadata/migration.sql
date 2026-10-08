-- CreateTable
CREATE TABLE \
PaymentMetadata\ (
    \id\ TEXT NOT NULL,
    \orderId\ TEXT NOT NULL,
    \paymentId\ TEXT NOT NULL,
    \provider\ TEXT NOT NULL,
    \encryptedData\ TEXT NOT NULL,
    \iv\ TEXT NOT NULL,
    \authTag\ TEXT,
    \status\ TEXT NOT NULL DEFAULT 'pending',
    \createdAt\ TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \updatedAt\ TIMESTAMP(3) NOT NULL,
    \confirmedAt\ TIMESTAMP(3),
    \confirmedBy\ TEXT,
    \note\ TEXT,
    CONSTRAINT \PaymentMetadata_pkey\ PRIMARY KEY (\id\)
);
CREATE UNIQUE INDEX \PaymentMetadata_orderId_key\ ON \PaymentMetadata\(\orderId\);
CREATE INDEX \PaymentMetadata_paymentId_idx\ ON \PaymentMetadata\(\paymentId\);
CREATE INDEX \PaymentMetadata_status_idx\ ON \PaymentMetadata\(\status\);

