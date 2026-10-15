import prisma from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";

export interface FormattedBook {
  id: string;
  bookCode: string;
  title: string;
  isbn: string;
  genre: string;
  publicationDate: Date | null;
  status: string;
  mrp: number | null;
  authorRoyaltyPerCopy: number | null;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastRoyaltyPayoutDate: Date | null;
  printPartner: string | null;
  availableOn: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthorRoyaltySummary {
  totalBooks: number;
  publishedBooks: number;
  inProductionBooks: number;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  minimumPayoutThreshold: number;
  payoutEligible: boolean;
}

export function formatBook(book: any): FormattedBook {
  return {
    id: book.id,
    bookCode: book.bookCode,
    title: book.title,
    isbn: book.isbn,
    genre: book.genre,
    publicationDate: book.publicationDate,
    status: book.status,
    mrp: book.mrp !== null ? Number(book.mrp) : null,
    authorRoyaltyPerCopy: book.authorRoyaltyPerCopy !== null ? Number(book.authorRoyaltyPerCopy) : null,
    totalCopiesSold: book.totalCopiesSold,
    totalRoyaltyEarned: Number(book.totalRoyaltyEarned),
    royaltyPaid: Number(book.royaltyPaid),
    royaltyPending: Number(book.royaltyPending),
    lastRoyaltyPayoutDate: book.lastRoyaltyPayoutDate,
    printPartner: book.printPartner,
    availableOn: Array.isArray(book.availableOn) ? book.availableOn : [],
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}

export async function getAuthorBooksAndRoyalties(authorProfileId: string) {
  const author = await prisma.authorProfile.findUnique({
    where: { id: authorProfileId },
    include: {
      books: {
        orderBy: [
          { publicationDate: "desc" },
          { createdAt: "desc" },
        ],
      },
    },
  });

  if (!author) {
    throw new AppError("Author profile not found", 404);
  }

  const formattedBooks = author.books.map(formatBook);

  let totalCopiesSold = 0;
  let totalRoyaltyEarned = 0;
  let royaltyPaid = 0;
  let royaltyPending = 0;
  let publishedBooks = 0;
  let inProductionBooks = 0;

  for (const book of formattedBooks) {
    totalCopiesSold += book.totalCopiesSold;
    totalRoyaltyEarned += book.totalRoyaltyEarned;
    royaltyPaid += book.royaltyPaid;
    royaltyPending += book.royaltyPending;

    if (book.status.toLowerCase().includes("published")) {
      publishedBooks++;
    } else if (book.status.toLowerCase().includes("production")) {
      inProductionBooks++;
    }
  }

  const summary: AuthorRoyaltySummary = {
    totalBooks: formattedBooks.length,
    publishedBooks,
    inProductionBooks,
    totalCopiesSold,
    totalRoyaltyEarned: Math.round(totalRoyaltyEarned * 100) / 100,
    royaltyPaid: Math.round(royaltyPaid * 100) / 100,
    royaltyPending: Math.round(royaltyPending * 100) / 100,
    minimumPayoutThreshold: 1000,
    payoutEligible: royaltyPending >= 1000,
  };

  return {
    author: {
      id: author.id,
      authorCode: author.authorCode,
      name: author.name,
      phone: author.phone,
      city: author.city,
      joinedDate: author.joinedDate,
    },
    books: formattedBooks,
    summary,
  };
}
