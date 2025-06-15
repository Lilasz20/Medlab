-- AlterTable
ALTER TABLE `LabMaterial` ADD COLUMN `createdById` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `LabMaterial_createdById_fkey` ON `LabMaterial`(`createdById`);

-- AddForeignKey
ALTER TABLE `LabMaterial` ADD CONSTRAINT `LabMaterial_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
