-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "client_id" TEXT,
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT,
    "client_email" TEXT,
    "client_document" TEXT,
    "client_document_type" TEXT,
    "category" TEXT,
    "subject" JSONB,
    "seller_id" TEXT,
    "seller_name" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount_type" TEXT,
    "taxes" DOUBLE PRECISION,
    "total_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accepted_payment_methods" TEXT[],
    "payment" JSONB,
    "notes" TEXT,
    "internal_notes" TEXT,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "converted_to_appointment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "unit_price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount_type" TEXT NOT NULL DEFAULT 'value',
    "total" DOUBLE PRECISION NOT NULL,
    "product_id" TEXT,
    "service_id" TEXT,
    "vehicle_id" TEXT,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
