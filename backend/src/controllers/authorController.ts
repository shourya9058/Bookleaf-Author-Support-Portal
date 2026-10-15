import type { Request, Response, NextFunction } from "express";
import { getAuthorBooksAndRoyalties } from "../services/authorService.js";
import { AppError } from "../utils/errors.js";

export async function getAuthorBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authorProfileId = req.user?.authorProfile?.id;

    if (!authorProfileId) {
      throw new AppError("Author profile not found for this user", 400);
    }

    const data = await getAuthorBooksAndRoyalties(authorProfileId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}
