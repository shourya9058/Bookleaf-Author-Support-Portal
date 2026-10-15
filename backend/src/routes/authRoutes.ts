import { Router } from "express";
import { login, getCurrentUser, loginSchema } from "../controllers/authController.js";
import { validateBody } from "../middleware/validateRequest.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", validateBody(loginSchema), login);
router.get("/me", authenticate, getCurrentUser);

export default router;
