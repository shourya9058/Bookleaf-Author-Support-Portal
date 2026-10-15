import { Router } from "express";
import { authenticate, requireAuthor, requireAdmin } from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/validateRequest.js";
import {
  createTicketSchema,
  createMessageSchema,
  updateTicketSchema,
} from "../validators/ticketValidators.js";
import {
  createTicket,
  getTickets,
  getTicketById,
  addTicketMessage,
  updateTicket,
  generateAiDraft,
  classifyTicket,
  applyAiSuggestions,
} from "../controllers/ticketController.js";

const router = Router();

// All ticket routes require authentication
router.use(authenticate);

// List tickets (Role-based: Author sees their tickets; Admin sees all)
router.get("/", getTickets);

// Create ticket (Author only)
router.post("/", requireAuthor, validateBody(createTicketSchema), createTicket);

// Get ticket details & conversation
router.get("/:id", getTicketById);

// Add message / reply (Author or Admin)
router.post("/:id/messages", validateBody(createMessageSchema), addTicketMessage);

// Update ticket status / metadata (Admin only)
router.patch("/:id", requireAdmin, validateBody(updateTicketSchema), updateTicket);

// Admin-Only AI Routes
router.post("/:id/ai/draft", requireAdmin, generateAiDraft);
router.post("/:id/ai/classify", requireAdmin, classifyTicket);
router.post("/:id/ai/apply", requireAdmin, applyAiSuggestions);

export default router;
