/*
  Warnings:

  - You are about to drop the column `content` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Message" DROP COLUMN "content",
ADD COLUMN     "document" TEXT,
ADD COLUMN     "text" TEXT;
