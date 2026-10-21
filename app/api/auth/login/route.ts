import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { database } from "@/drizzle";
import { usersTable } from "@/drizzle/schema";
import { createToken } from "@/lib/auth";

// Defines exactly what data we expect from the login form.
// Zod will reject the request immediately if anything is missing or invalid.
const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

// Runs when someone sends a POST request to /api/auth/login
export async function POST(req: NextRequest) {
  try {
    
    const body = await req.json();

    // If the validation fails, return a 400 Bad Request response with the error message
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Look for the user with this email in the database
    const [user] = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    // If no user is found, return a 401 Unauthorized response
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Compare the provided password with the hashed password in the database
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create a JWT token with the user's ID and email as the payload
    const token = createToken({
      userId: user.userId,
      email: user.email,
      username: user.username,
    });

    // Return the token and some basic user info to the frontend
    return NextResponse.json(
      {
        message: "Logged in successfully!",
        token,
        user: {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
