-- CreateTable
CREATE TABLE `RadiationResult` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `resultDetails` VARCHAR(191) NOT NULL,
    `reportText` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `testAssignmentId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RadiationResult` ADD CONSTRAINT `RadiationResult_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RadiationResult` ADD CONSTRAINT `RadiationResult_testAssignmentId_fkey` FOREIGN KEY (`testAssignmentId`) REFERENCES `TestAssignment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RadiationResult` ADD CONSTRAINT `RadiationResult_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
