import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma.js";
import { Role } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawBook {
  book_id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
}

interface RawAuthor {
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
  books: RawBook[];
}

interface SampleData {
  authors: RawAuthor[];
}

export async function seed() {
  console.log("Starting database seed...");

  // Safety confirmation: Verify active database name before seeding
  const dbUrl = new URL(process.env.DATABASE_URL || "");
  const targetDb = dbUrl.pathname.replace(/^\//, "");
  if (targetDb !== "bookleaf_support_portal") {
    throw new Error(`ABORT: Target database is '${targetDb}', not 'bookleaf_support_portal'. Aborting seed.`);
  }

  // Admin configuration
  const adminEmail = process.env.ADMIN_EMAIL || "admin@bookleaf.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@BookLeaf2026!";
  const defaultAuthorPassword = process.env.DEFAULT_AUTHOR_PASSWORD || "Author@BookLeaf2026!";

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const authorPasswordHash = await bcrypt.hash(defaultAuthorPassword, 10);

  // 1. Seed or update Development Admin Account
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Admin user verified: ${adminUser.email} (Role: ${adminUser.role})`);

  // 2. Load Sample Data
  const sampleDataPath = path.resolve(__dirname, "../../bookleaf_sample_data.json");
  if (!fs.existsSync(sampleDataPath)) {
    throw new Error(`Sample data file not found at: ${sampleDataPath}`);
  }

  const rawContent = fs.readFileSync(sampleDataPath, "utf-8");
  const data: SampleData = JSON.parse(rawContent);

  console.log(`Found ${data.authors.length} authors in sample dataset.`);

  let totalBooksSeeded = 0;

  for (const rawAuthor of data.authors) {
    // Upsert User for Author
    const user = await prisma.user.upsert({
      where: { email: rawAuthor.email },
      update: {
        role: Role.AUTHOR,
      },
      create: {
        email: rawAuthor.email,
        passwordHash: authorPasswordHash,
        role: Role.AUTHOR,
      },
    });

    // Upsert AuthorProfile
    const authorProfile = await prisma.authorProfile.upsert({
      where: { authorCode: rawAuthor.author_id },
      update: {
        name: rawAuthor.name,
        phone: rawAuthor.phone,
        city: rawAuthor.city,
        joinedDate: rawAuthor.joined_date ? new Date(rawAuthor.joined_date) : null,
        userId: user.id,
      },
      create: {
        authorCode: rawAuthor.author_id,
        userId: user.id,
        name: rawAuthor.name,
        phone: rawAuthor.phone,
        city: rawAuthor.city,
        joinedDate: rawAuthor.joined_date ? new Date(rawAuthor.joined_date) : null,
      },
    });

    // Upsert Books for Author
    for (const rawBook of rawAuthor.books) {
      await prisma.book.upsert({
        where: { bookCode: rawBook.book_id },
        update: {
          authorId: authorProfile.id,
          title: rawBook.title,
          isbn: rawBook.isbn,
          genre: rawBook.genre,
          publicationDate: rawBook.publication_date ? new Date(rawBook.publication_date) : null,
          status: rawBook.status,
          mrp: rawBook.mrp !== null ? rawBook.mrp : null,
          authorRoyaltyPerCopy: rawBook.author_royalty_per_copy !== null ? rawBook.author_royalty_per_copy : null,
          totalCopiesSold: rawBook.total_copies_sold,
          totalRoyaltyEarned: rawBook.total_royalty_earned,
          royaltyPaid: rawBook.royalty_paid,
          royaltyPending: rawBook.royalty_pending,
          lastRoyaltyPayoutDate: rawBook.last_royalty_payout_date ? new Date(rawBook.last_royalty_payout_date) : null,
          printPartner: rawBook.print_partner,
          availableOn: rawBook.available_on,
        },
        create: {
          bookCode: rawBook.book_id,
          authorId: authorProfile.id,
          title: rawBook.title,
          isbn: rawBook.isbn,
          genre: rawBook.genre,
          publicationDate: rawBook.publication_date ? new Date(rawBook.publication_date) : null,
          status: rawBook.status,
          mrp: rawBook.mrp !== null ? rawBook.mrp : null,
          authorRoyaltyPerCopy: rawBook.author_royalty_per_copy !== null ? rawBook.author_royalty_per_copy : null,
          totalCopiesSold: rawBook.total_copies_sold,
          totalRoyaltyEarned: rawBook.total_royalty_earned,
          royaltyPaid: rawBook.royalty_paid,
          royaltyPending: rawBook.royalty_pending,
          lastRoyaltyPayoutDate: rawBook.last_royalty_payout_date ? new Date(rawBook.last_royalty_payout_date) : null,
          printPartner: rawBook.print_partner,
          availableOn: rawBook.available_on,
        },
      });
      totalBooksSeeded++;
    }
  }

  // 3. Final counts verification
  const totalAuthors = await prisma.authorProfile.count();
  const totalBooks = await prisma.book.count();
  const totalUsers = await prisma.user.count();

  console.log("--- SEED VERIFICATION ---");
  console.log(`Total Authors in DB: ${totalAuthors} (Expected: 10)`);
  console.log(`Total Books in DB:   ${totalBooks} (Expected: 18)`);
  console.log(`Total Users in DB:   ${totalUsers} (10 authors + 1 admin = 11)`);
  console.log("Seed completed successfully!");
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seed()
    .catch((e) => {
      console.error("Seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
