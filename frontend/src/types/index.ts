export type Role = 'AUTHOR' | 'ADMIN';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TicketCategory =
  | 'ROYALTY_AND_PAYMENTS'
  | 'ISBN_AND_METADATA'
  | 'PRINTING_AND_QUALITY'
  | 'DISTRIBUTION_AND_AVAILABILITY'
  | 'BOOK_STATUS_AND_PRODUCTION'
  | 'GENERAL_INQUIRY';

export interface AuthorProfile {
  id: string;
  authorCode: string;
  name: string;
  phone?: string | null;
  city?: string | null;
  joinedDate?: string | null;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  authorProfile?: AuthorProfile | null;
}

export interface Book {
  id: string;
  bookCode: string;
  title: string;
  isbn: string;
  genre: string;
  publicationDate: string | null;
  status: string;
  mrp: number | null;
  authorRoyaltyPerCopy: number | null;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastRoyaltyPayoutDate: string | null;
  printPartner: string | null;
  availableOn: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoyaltySummary {
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

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    email: string;
    role: Role;
    authorProfile?: {
      id?: string;
      name: string;
      authorCode?: string;
    } | null;
  };
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  authorId: string;
  bookId?: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  aiClassification?: TicketCategory | null;
  aiPriority?: TicketPriority | null;
  aiConfidence?: number | null;
  aiReasoning?: string | null;
  aiDraftResponse?: string | null;
  assignedAdminId?: string | null;
  createdAt: string;
  updatedAt: string;
  replyCount?: number;
  latestReply?: {
    id: string;
    content: string;
    createdAt: string;
    sender: {
      role: Role;
      email: string;
      authorProfile?: { name: string } | null;
    };
  } | null;
  author?: {
    id: string;
    authorCode: string;
    name: string;
    phone?: string | null;
    city?: string | null;
    user?: { email: string };
  };
  book?: {
    id: string;
    bookCode: string;
    title: string;
    isbn: string;
    status: string;
    mrp?: number | null;
    totalCopiesSold?: number;
    totalRoyaltyEarned?: number;
    royaltyPending?: number;
  } | null;
  assignedAdmin?: {
    id: string;
    email: string;
  } | null;
  messages?: TicketMessage[];
}
