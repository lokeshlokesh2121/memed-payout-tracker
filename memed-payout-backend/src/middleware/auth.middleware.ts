
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../models/User.js";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication token required"
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    res.status(401).json({
      success: false,
      message: "Invalid authentication configuration or token"
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string" ||
      (decoded.role !== "brand" && decoded.role !== "creator")
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid token payload"
      });
      return;
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}
