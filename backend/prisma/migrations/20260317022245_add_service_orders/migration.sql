-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "quote_id" TEXT,
    "client_id" TEXT,
    "client_name" TEXT NOT NULL,
    "vehicle" TEXT,
    "subject" JSONB,
    "service_type" TEXT NOT NULL DEFAULT 'Serviço',
    "employee_id" TEXT,
    "employee_name" TEXT,
    "date" TEXT NOT NULL,
    "end_date" TEXT,
    "start_time" TEXT,
    "end_time" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "items" JSONB,
    "notes" TEXT,
    "internal_notes" TEXT,
    "created_by_id" TEXT,
    "created_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_quote_id_key" ON "service_orders"("quote_id");

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
