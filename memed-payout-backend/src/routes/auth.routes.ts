
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = Router();

router.post(
  "/signup",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, role } = req.body;

      // 1. Validate required fields
      if (!name || !email || !password || !role) {
        res.status(400).json({
          success: false,
          message: "All fields are required"
        });
        return;
      }

      // 2. Validate role
      if (!["brand", "creator"].includes(role)) {
        res.status(400).json({
          success: false,
          message: "Role must be brand or creator"
        });
        return;
      }

      // 3. Validate password length
      if (typeof password !== "string" || password.length < 8) {
        res.status(400).json({
          success: false,
          message: "Password must contain at least 8 characters"
        });
        return;
      }

      // 4. Normalize and validate email
      if (typeof email !== "string") {
        res.status(400).json({
          success: false,
          message: "Invalid email"
        });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        res.status(400).json({
          success: false,
          message: "Please provide a valid email"
        });
        return;
      }

      // 5. Check for an existing user
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

      // 6. Hash the password
      const hashedPassword = await bcrypt.hash(password, 12);

      // 7. Save the user
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role
      });

      // 8. Return safe user details
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
    } catch (error) {
      // Handle duplicate email attempts safely
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



router.post(
  "/login",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // 1. Validate required fields
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

      // 2. Find user and explicitly include password
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

      // 3. Compare provided password with stored hash
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

      // 4. Check JWT secret
      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret || jwtSecret === "replace_with_a_long_random_secret") {
        res.status(500).json({
          success: false,
          message: "Server authentication is not configured"
        });
        return;
      }

      // 5. Generate JWT
      const token = require("jsonwebtoken").sign(
        {
          userId: user._id.toString(),
          role: user.role
        },
        jwtSecret,
        { expiresIn: "1h" }
      );

      // 6. Return token and safe user details
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
    } catch (error) {
      console.error("Login error:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
);


export default router;
