-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
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
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quote_id" TEXT,
    "materials_used" JSONB,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
