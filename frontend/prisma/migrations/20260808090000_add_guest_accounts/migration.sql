ALTER TABLE "users"
    ADD COLUMN "is_guest" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "guest_expires_at" TIMESTAMP(3),
    ADD CONSTRAINT "users_guest_expiration_consistency" CHECK (
        ("is_guest" = true AND "guest_expires_at" IS NOT NULL)
        OR ("is_guest" = false AND "guest_expires_at" IS NULL)
    );

CREATE INDEX "users_is_guest_guest_expires_at_idx"
    ON "users"("is_guest", "guest_expires_at");
