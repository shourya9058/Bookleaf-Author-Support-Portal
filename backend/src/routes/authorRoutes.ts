import { Router } from "express";
import { authenticate, requireAuthor } from "../middleware/authMiddleware.js";
import { getAuthorBooks } from "../controllers/authorController.js";

const router = Router();

router.use(authenticate);

// Author books and royalty summary
router.get("/books", requireAuthor, getAuthorBooks);

export default router;
