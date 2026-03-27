-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "price_per_store" INTEGER NOT NULL DEFAULT 7990,
    "due_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pix_charges" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "external_id" TEXT,
    "amount" INTEGER NOT NULL,
    "store_count" INTEGER NOT NULL,
    "reference_month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "br_code" TEXT,
    "qr_code_image" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pix_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_company_id_key" ON "subscriptions"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "pix_charges_correlation_id_key" ON "pix_charges"("correlation_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
