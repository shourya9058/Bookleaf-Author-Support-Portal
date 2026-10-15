import prisma from "../lib/prisma.js";
import { Role, TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import { AppError } from "../utils/errors.js";
import { generateTicketNumber } from "../utils/ticketNumber.js";
import type { AuthenticatedUser } from "../middleware/authMiddleware.js";
import aiService from "./ai/aiService.js";

export interface CreateTicketParams {
  authorProfileId: string;
  subject: string;
  description: string;
  bookId?: string | null;
  category?: TicketCategory;
  priority?: TicketPriority;
}

export interface TicketListFilters {
  status?: TicketStatus | undefined;
  category?: TicketCategory | undefined;
  priority?: TicketPriority | undefined;
  bookId?: string | undefined;
  search?: string | undefined;
  sortBy?: "urgent" | "oldest" | "newest" | undefined;
}

export async function createTicket(params: CreateTicketParams) {
  const { authorProfileId, subject, description, bookId, category, priority } = params;

  // Validate author profile exists
  const author = await prisma.authorProfile.findUnique({
    where: { id: authorProfileId },
  });

  if (!author) {
    throw new AppError("Author profile not found", 404);
  }

  // Validate book ownership if bookId is provided
  let validatedBookId: string | null = null;
  if (bookId) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      throw new AppError("Selected book was not found", 400);
    }

    if (book.authorId !== authorProfileId) {
      throw new AppError("Forbidden: Selected book does not belong to your account", 403);
    }

    validatedBookId = book.id;
  }

  const ticketNumber = await generateTicketNumber();

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      authorId: authorProfileId,
      bookId: validatedBookId,
      subject,
      description,
      category: category || TicketCategory.GENERAL_INQUIRY,
      priority: priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
    },
    include: {
      book: {
        select: {
          id: true,
          bookCode: true,
          title: true,
          isbn: true,
          status: true,
        },
      },
      author: {
        select: {
          id: true,
          authorCode: true,
          name: true,
        },
      },
    },
  });

  // Attempt automatic AI classification (AI failure must never block ticket creation)
  try {
    const aiResult = await aiService.classifyTicket({
      subject: ticket.subject,
      description: ticket.description,
      bookTitle: ticket.book?.title ?? null,
      bookStatus: ticket.book?.status ?? null,
    });

    if (aiResult.success && aiResult.category && aiResult.priority) {
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          aiClassification: aiResult.category,
          aiPriority: aiResult.priority,
          aiConfidence: aiResult.confidence ?? 0.85,
          aiReasoning: aiResult.reasoning ?? null,
        },
        include: {
          book: {
            select: {
              id: true,
              bookCode: true,
              title: true,
              isbn: true,
              status: true,
            },
          },
          author: {
            select: {
              id: true,
              authorCode: true,
              name: true,
            },
          },
        },
      });
      return updatedTicket;
    }
  } catch (aiErr) {
    console.warn("Non-fatal AI auto-classification failed during ticket creation:", aiErr);
  }

  return ticket;
}

export async function getAuthorTickets(authorProfileId: string, filters?: TicketListFilters) {
  const where: any = {
    authorId: authorProfileId,
  };

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.bookId) {
    where.bookId = filters.bookId;
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      book: {
        select: {
          id: true,
          bookCode: true,
          title: true,
          isbn: true,
          status: true,
        },
      },
      _count: {
        select: {
          messages: {
            where: { isInternal: false },
          },
        },
      },
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          sender: {
            select: {
              role: true,
              email: true,
              authorProfile: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
  });

  return tickets.map((t) => ({
    ...t,
    replyCount: t._count.messages,
    latestReply: t.messages[0] || null,
  }));
}

export async function getAllTickets(filters?: TicketListFilters) {
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.priority) {
    where.priority = filters.priority;
  }
  if (filters?.search) {
    where.OR = [
      { ticketNumber: { contains: filters.search } },
      { subject: { contains: filters.search } },
      { author: { name: { contains: filters.search } } },
    ];
  }

  let orderBy: any = [
    { priority: "asc" }, // CRITICAL, HIGH, MEDIUM, LOW
    { createdAt: "desc" },
  ];

  if (filters?.sortBy === "oldest") {
    orderBy = [{ createdAt: "asc" }];
  } else if (filters?.sortBy === "newest") {
    orderBy = [{ createdAt: "desc" }];
  } else if (filters?.sortBy === "urgent") {
    orderBy = [
      { priority: "asc" },
      { createdAt: "asc" }, // Oldest unresolved urgent tickets first
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy,
    include: {
      author: {
        select: {
          id: true,
          authorCode: true,
          name: true,
          city: true,
          user: { select: { email: true } },
        },
      },
      book: {
        select: {
          id: true,
          bookCode: true,
          title: true,
          isbn: true,
          status: true,
        },
      },
      assignedAdmin: {
        select: {
          id: true,
          email: true,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  return tickets;
}

export async function getTicketById(ticketId: string, user: AuthenticatedUser) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      author: {
        select: {
          id: true,
          authorCode: true,
          name: true,
          phone: true,
          city: true,
          user: { select: { email: true } },
        },
      },
      book: {
        select: {
          id: true,
          bookCode: true,
          title: true,
          isbn: true,
          status: true,
          mrp: true,
          totalCopiesSold: true,
          totalRoyaltyEarned: true,
          royaltyPending: true,
        },
      },
      assignedAdmin: {
        select: {
          id: true,
          email: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              role: true,
              authorProfile: {
                select: {
                  id: true,
                  name: true,
                  authorCode: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  // Authorization and internal notes filtering
  if (user.role === Role.AUTHOR) {
    if (!user.authorProfile || ticket.authorId !== user.authorProfile.id) {
      throw new AppError("Forbidden: You do not have permission to view this ticket", 403);
    }

    // Authors MUST NOT see internal notes!
    const sanitizedMessages = ticket.messages.filter((msg) => !msg.isInternal);

    return {
      ...ticket,
      messages: sanitizedMessages,
    };
  }

  // Admins see all messages including internal notes
  return ticket;
}

export async function addTicketMessage(
  ticketId: string,
  user: AuthenticatedUser,
  content: string,
  isInternal: boolean = false
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, authorId: true, status: true },
  });

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  let finalIsInternal = isInternal;

  if (user.role === Role.AUTHOR) {
    if (!user.authorProfile || ticket.authorId !== user.authorProfile.id) {
      throw new AppError("Forbidden: You cannot message on another author's ticket", 403);
    }
    // Authors can never create internal notes
    finalIsInternal = false;
  }

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderId: user.id,
      content,
      isInternal: finalIsInternal,
    },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          role: true,
          authorProfile: {
            select: {
              id: true,
              name: true,
              authorCode: true,
            },
          },
        },
      },
    },
  });

  // If admin responds publicly to an OPEN ticket, transition status to IN_PROGRESS
  let updatedStatus = ticket.status;
  if (user.role === Role.ADMIN && !finalIsInternal && ticket.status === TicketStatus.OPEN) {
    updatedStatus = TicketStatus.IN_PROGRESS;
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: updatedStatus,
      updatedAt: new Date(),
    },
  });

  return message;
}

export async function updateTicket(
  ticketId: string,
  user: AuthenticatedUser,
  updates: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
    assignedAdminId?: string | null;
  }
) {
  if (user.role !== Role.ADMIN) {
    throw new AppError("Forbidden: Only administrators can update ticket status or metadata", 403);
  }

  const existingTicket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!existingTicket) {
    throw new AppError("Ticket not found", 404);
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ...(updates.status && { status: updates.status }),
      ...(updates.priority && { priority: updates.priority }),
      ...(updates.category && { category: updates.category }),
      ...(updates.assignedAdminId !== undefined && { assignedAdminId: updates.assignedAdminId }),
      updatedAt: new Date(),
    },
    include: {
      author: {
        select: {
          id: true,
          authorCode: true,
          name: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          isbn: true,
        },
      },
      assignedAdmin: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return updatedTicket;
}

export async function generateTicketDraft(ticketId: string, user: AuthenticatedUser) {
  if (user.role !== Role.ADMIN) {
    throw new AppError("Forbidden: Only administrators can generate AI drafts", 403);
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      author: {
        select: {
          name: true,
          authorCode: true,
        },
      },
      book: {
        select: {
          title: true,
          isbn: true,
          status: true,
          mrp: true,
          totalCopiesSold: true,
          royaltyPending: true,
        },
      },
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { role: true } },
        },
      },
    },
  });

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  const conversationHistory = ticket.messages.map((m) => ({
    senderRole: m.sender.role,
    content: m.content,
  }));

  const draftResult = await aiService.generateDraftResponse({
    authorName: ticket.author.name,
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.aiClassification || ticket.category,
    book: ticket.book
      ? {
          title: ticket.book.title,
          isbn: ticket.book.isbn,
          status: ticket.book.status,
          mrp: ticket.book.mrp !== null ? Number(ticket.book.mrp) : null,
          totalCopiesSold: ticket.book.totalCopiesSold,
          royaltyPending: Number(ticket.book.royaltyPending),
        }
      : null,
    conversationHistory,
  });

  if (draftResult.success && draftResult.draft) {
    // Persist draft on ticket record
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        aiDraftResponse: draftResult.draft,
        updatedAt: new Date(),
      },
    });
  }

  return {
    ...draftResult,
    reasoning: ticket.aiReasoning,
  };
}

export async function classifyTicketById(ticketId: string, user: AuthenticatedUser) {
  if (user.role !== Role.ADMIN) {
    throw new AppError("Forbidden: Only administrators can reclassify tickets", 403);
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      book: {
        select: {
          title: true,
          status: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  const result = await aiService.classifyTicket({
    subject: ticket.subject,
    description: ticket.description,
    bookTitle: ticket.book?.title ?? null,
    bookStatus: ticket.book?.status ?? null,
  });

  if (result.success && result.category && result.priority) {
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        aiClassification: result.category,
        aiPriority: result.priority,
        aiConfidence: result.confidence ?? 0.85,
        aiReasoning: result.reasoning ?? null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        aiClassification: true,
        aiPriority: true,
        aiConfidence: true,
        aiReasoning: true,
      },
    });

    return {
      ...result,
      ticket: updated,
    };
  }

  return result;
}

export async function applyAiSuggestions(
  ticketId: string,
  user: AuthenticatedUser,
  applyCategory: boolean = true,
  applyPriority: boolean = true
) {
  if (user.role !== Role.ADMIN) {
    throw new AppError("Forbidden: Only administrators can apply AI suggestions", 403);
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  if (!ticket.aiClassification && !ticket.aiPriority) {
    throw new AppError("No AI classification suggestions are available for this ticket", 400);
  }

  const dataToUpdate: any = {};
  if (applyCategory && ticket.aiClassification) {
    dataToUpdate.category = ticket.aiClassification;
  }
  if (applyPriority && ticket.aiPriority) {
    dataToUpdate.priority = ticket.aiPriority;
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      ...dataToUpdate,
      updatedAt: new Date(),
    },
    include: {
      author: {
        select: {
          id: true,
          authorCode: true,
          name: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          isbn: true,
        },
      },
    },
  });

  return updatedTicket;
}
