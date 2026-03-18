-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "created_by_name" TEXT;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
