
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

const PLACEHOLDER_JWT_SECRET =
  "replace_with_a_long_random_secret";

// -------------------- SIGNUP --------------------

router.post(
  "/signup",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, role } = req.body;

      // Validate required fields
      if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        !name.trim() ||
        !email.trim() ||
        !password ||
        !role
      ) {
        res.status(400).json({
          success: false,
          message: "All fields are required"
        });
        return;
      }

      // Validate role
      if (!["brand", "creator"].includes(role)) {
        res.status(400).json({
          success: false,
          message: "Role must be brand or creator"
        });
        return;
      }

      // Validate password length
      if (password.length < 8) {
        res.status(400).json({
          success: false,
          message: "Password must contain at least 8 characters"
        });
        return;
      }

      // Normalize and validate email
      const normalizedEmail = email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        res.status(400).json({
          success: false,
          message: "Please provide a valid email"
        });
        return;
      }

      // Check for an existing user
      const existingUser = await User.findOne({
        email: normalizedEmail
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: "Email is already registered"
        });
        return;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Save the user
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role
      });

      // Return safe user details
      res.status(201).json({
        success: true,
        message: "Account created successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error: unknown) {
      // Handle duplicate email attempts
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        res.status(409).json({
          success: false,
          message: "Email is already registered"
        });
        return;
      }

      console.error("Signup error:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
);

// -------------------- LOGIN --------------------

router.post(
  "/login",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
      ) {
        res.status(400).json({
          success: false,
          message: "Email and password are required"
        });
        return;
      }

      // Check JWT configuration before processing login
      const jwtSecret = process.env.JWT_SECRET;

      if (
        !jwtSecret ||
        !jwtSecret.trim() ||
        jwtSecret === PLACEHOLDER_JWT_SECRET
      ) {
        console.error(
          "Login failed: JWT_SECRET is missing or still set to the placeholder."
        );

        res.status(500).json({
          success: false,
          message: "Server authentication is not configured"
        });
        return;
      }

      // Find user and explicitly include password
      const user = await User.findOne({
        email: email.trim().toLowerCase()
      }).select("+password");

      if (!user) {
        res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
        return;
      }

      // Compare provided password with stored hash
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password
      );

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
        return;
      }

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          role: user.role
        },
        jwtSecret,
        {
          expiresIn: "1h"
        }
      );

      // Return token and safe user details
      res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error: unknown) {
      console.error("Login error:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
);

export default router;
