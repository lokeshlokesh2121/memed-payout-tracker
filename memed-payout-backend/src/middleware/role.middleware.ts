
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware.js";
import { UserRole } from "../models/User.js";

export function allowRoles(...allowedRoles: UserRole[]) {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Please login first"
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action"
      });
      return;
    }

    next();
  };
}
