import { z } from "zod";
import { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";

export const createTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters")
    .max(200, "Subject cannot exceed 200 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters"),
  bookId: z.string().uuid("Invalid book ID format").nullable().optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
});

export const createMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message content cannot be empty"),
  isInternal: z.boolean().optional().default(false),
});

export const updateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  assignedAdminId: z.string().uuid("Invalid admin ID").nullable().optional(),
});
