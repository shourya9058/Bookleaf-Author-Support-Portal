import { Router, type Request, type Response } from "express";
import {
  authenticate,
  requireAdmin,
  requireAuthor,
  enforceAuthorOwnership,
} from "../middleware/authMiddleware.js";

const router = Router();

// Endpoint accessible only by Admins
router.get("/admin-only", authenticate, requireAdmin, (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Admin authorization verified",
    user: req.user,
  });
});

// Endpoint accessible only by Authors
router.get("/author-only", authenticate, requireAuthor, (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Author authorization verified",
    user: req.user,
  });
});

// Endpoint demonstrating author resource ownership enforcement
router.get(
  "/authors/:authorId/books",
  authenticate,
  enforceAuthorOwnership((req: Request) => {
    const authorId = req.params["authorId"];
    return typeof authorId === "string" ? authorId : undefined;
  }),
  (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: `Ownership verified for authorProfile ${req.params["authorId"]}`,
      requestedBy: req.user?.email,
      role: req.user?.role,
    });
  }
);

export default router;
