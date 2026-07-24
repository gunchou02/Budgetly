ALTER TABLE "receipts"
    ADD CONSTRAINT "receipts_file_size_maximum" CHECK ("file_size" <= 5242880);
