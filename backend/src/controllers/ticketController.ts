import type { Request, Response, NextFunction } from "express";
import { Role, TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import * as ticketService from "../services/ticketService.js";
import { AppError } from "../utils/errors.js";

function getSingleParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) {
    return param[0] || "";
  }
  return param || "";
}

export async function createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || req.user.role !== Role.AUTHOR || !req.user.authorProfile) {
      throw new AppError("Only authors can submit support tickets", 403);
    }

    const { subject, description, bookId, category, priority } = req.body;

    const ticket = await ticketService.createTicket({
      authorProfileId: req.user.authorProfile.id,
      subject,
      description,
      bookId: bookId || null,
      category,
      priority,
    });

    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { status, category, priority, bookId, search, sortBy } = req.query;

    const filters: ticketService.TicketListFilters = {
      status: (status as TicketStatus) || undefined,
      category: (category as TicketCategory) || undefined,
      priority: (priority as TicketPriority) || undefined,
      bookId: (bookId as string) || undefined,
      search: (search as string) || undefined,
      sortBy: (sortBy as "urgent" | "oldest" | "newest") || undefined,
    };

    if (req.user.role === Role.AUTHOR) {
      if (!req.user.authorProfile) {
        throw new AppError("Author profile not found", 400);
      }
      const tickets = await ticketService.getAuthorTickets(req.user.authorProfile.id, filters);
      res.status(200).json({
        success: true,
        data: { tickets },
      });
      return;
    }

    // Admin listing
    const tickets = await ticketService.getAllTickets(filters);
    res.status(200).json({
      success: true,
      data: { tickets },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTicketById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getSingleParam(req.params.id);
    if (!id) {
      throw new AppError("Ticket ID is required", 400);
    }

    const ticket = await ticketService.getTicketById(id, req.user);

    res.status(200).json({
      success: true,
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
}

export async function addTicketMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getSingleParam(req.params.id);
    if (!id) {
      throw new AppError("Ticket ID is required", 400);
    }

    const { content, isInternal } = req.body;

    const message = await ticketService.addTicketMessage(
      id,
      req.user,
      content,
      Boolean(isInternal)
    );

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: { message },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getSingleParam(req.params.id);
    if (!id) {
      throw new AppError("Ticket ID is required", 400);
    }

    const { status, priority, category, assignedAdminId } = req.body;

    const updated = await ticketService.updateTicket(id, req.user, {
      status,
      priority,
      category,
      assignedAdminId,
    });

    res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: { ticket: updated },
    });
  } catch (error) {
    next(error);
  }
}

export async function generateAiDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getSingleParam(req.params.id);
    if (!id) {
      throw new AppError("Ticket ID is required", 400);
    }

    const result = await ticketService.generateTicketDraft(id, req.user);

    res.status(200).json({
      success: result.success,
      message: result.success ? "AI draft generated successfully" : result.error || "AI service unavailable",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function classifyTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getSingleParam(req.params.id);
    if (!id) {
      throw new AppError("Ticket ID is required", 400);
    }

    const result = await ticketService.classifyTicketById(id, req.user);

    res.status(200).json({
      success: result.success,
      message: result.success ? "Ticket classified successfully" : result.error || "AI service unavailable",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function applyAiSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const id = getSingleParam(req.params.id);
    if (!id) {
      throw new AppError("Ticket ID is required", 400);
    }

    const { applyCategory, applyPriority } = req.body;

    const updated = await ticketService.applyAiSuggestions(
      id,
      req.user,
      applyCategory !== false,
      applyPriority !== false
    );

    res.status(200).json({
      success: true,
      message: "AI suggestions applied to ticket",
      data: { ticket: updated },
    });
  } catch (error) {
    next(error);
  }
}
