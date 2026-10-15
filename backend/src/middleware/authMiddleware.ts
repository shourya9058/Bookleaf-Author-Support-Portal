import type { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyToken, type TokenPayload } from "../utils/jwt.js";
import prisma from "../lib/prisma.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  authorProfile?: {
    id: string;
    authorCode: string;
    name: string;
  } | null | undefined;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser | undefined;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required: Missing or malformed Bearer token",
    });
    return;
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required: Token cannot be empty",
    });
    return;
  }

  let payload: TokenPayload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed: Invalid or expired token",
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        authorProfile: {
          select: {
            id: true,
            authorCode: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication failed: User account no longer exists",
      });
      return;
    }

    req.user = user;
    next();
  } catch (dbError) {
    next(dbError);
  }
}

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Forbidden: Insufficient permissions for this resource",
      });
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole([Role.ADMIN]);
export const requireAuthor = requireRole([Role.AUTHOR]);

/**
 * Enforces that an author can only access their own resource.
 * Admins are permitted to access any author resource.
 */
export function enforceAuthorOwnership(
  getAuthorProfileId: (req: Request) => string | undefined | Promise<string | undefined>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Admins bypass author-specific ownership checks
    if (req.user.role === Role.ADMIN) {
      next();
      return;
    }

    const targetAuthorProfileId = await getAuthorProfileId(req);

    if (!targetAuthorProfileId || req.user.authorProfile?.id !== targetAuthorProfileId) {
      res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to access records belonging to another author",
      });
      return;
    }

    next();
  };
}
