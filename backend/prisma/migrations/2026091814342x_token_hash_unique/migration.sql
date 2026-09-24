DROP INDEX IF EXISTS "RefreshToken_tokenHash_key";
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
