-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('AUTHOR', 'ADMIN') NOT NULL DEFAULT 'AUTHOR',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthorProfile` (
    `id` VARCHAR(191) NOT NULL,
    `authorCode` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `joinedDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AuthorProfile_authorCode_key`(`authorCode`),
    UNIQUE INDEX `AuthorProfile_userId_key`(`userId`),
    INDEX `AuthorProfile_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Book` (
    `id` VARCHAR(191) NOT NULL,
    `bookCode` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `isbn` VARCHAR(191) NOT NULL,
    `genre` VARCHAR(191) NOT NULL,
    `publicationDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL,
    `mrp` DECIMAL(10, 2) NULL,
    `authorRoyaltyPerCopy` DECIMAL(10, 2) NULL,
    `totalCopiesSold` INTEGER NOT NULL DEFAULT 0,
    `totalRoyaltyEarned` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `royaltyPaid` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `royaltyPending` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `lastRoyaltyPayoutDate` DATETIME(3) NULL,
    `printPartner` VARCHAR(191) NULL,
    `availableOn` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Book_bookCode_key`(`bookCode`),
    INDEX `Book_authorId_idx`(`authorId`),
    INDEX `Book_isbn_idx`(`isbn`),
    INDEX `Book_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ticket` (
    `id` VARCHAR(191) NOT NULL,
    `ticketNumber` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `bookId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` ENUM('ROYALTY_AND_PAYMENTS', 'ISBN_AND_METADATA', 'PRINTING_AND_QUALITY', 'DISTRIBUTION_AND_AVAILABILITY', 'BOOK_STATUS_AND_PRODUCTION', 'GENERAL_INQUIRY') NOT NULL DEFAULT 'GENERAL_INQUIRY',
    `priority` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `aiClassification` ENUM('ROYALTY_AND_PAYMENTS', 'ISBN_AND_METADATA', 'PRINTING_AND_QUALITY', 'DISTRIBUTION_AND_AVAILABILITY', 'BOOK_STATUS_AND_PRODUCTION', 'GENERAL_INQUIRY') NULL,
    `aiPriority` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NULL,
    `aiConfidence` DOUBLE NULL,
    `aiDraftResponse` TEXT NULL,
    `assignedAdminId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ticket_ticketNumber_key`(`ticketNumber`),
    INDEX `Ticket_authorId_idx`(`authorId`),
    INDEX `Ticket_bookId_idx`(`bookId`),
    INDEX `Ticket_status_idx`(`status`),
    INDEX `Ticket_priority_idx`(`priority`),
    INDEX `Ticket_category_idx`(`category`),
    INDEX `Ticket_assignedAdminId_idx`(`assignedAdminId`),
    INDEX `Ticket_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketMessage` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TicketMessage_ticketId_idx`(`ticketId`),
    INDEX `TicketMessage_senderId_idx`(`senderId`),
    INDEX `TicketMessage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuthorProfile` ADD CONSTRAINT `AuthorProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Book` ADD CONSTRAINT `Book_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `AuthorProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `AuthorProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_assignedAdminId_fkey` FOREIGN KEY (`assignedAdminId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMessage` ADD CONSTRAINT `TicketMessage_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMessage` ADD CONSTRAINT `TicketMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
