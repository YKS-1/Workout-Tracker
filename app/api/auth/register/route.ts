import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { database } from "@/drizzle";
import { usersTable } from "@/drizzle/schema";
import { createToken } from "@/lib/auth";
import { createDefaultWorkoutsForUser } from "@/lib/defaultWorkouts";


// Defines exactly what data we expect from the registration form.
// Zod will reject the request immediately if anything is missing or invalid.
const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  dateOfBirth: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid date of birth",
  }),
  height: z.number().positive("Height must be a positive number"),
  heightUnit: z.enum(["cm", "ft"]),
  weight: z.number().positive("Weight must be a positive number"),
  weightUnit: z.enum(["kg", "lbs"]),
});

// Runs when someone sends a POST request to /api/auth/register
export async function POST(req: NextRequest) {
  try {
    
    // Parse the JSON body of the request and validate it against the schema
    const body = await req.json();

    // If the validation fails, return a 400 Bad Request response with the error message
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { firstName, lastName, username, email, password, dateOfBirth, height, heightUnit, weight, weightUnit } =
      validation.data;

    // Check if a user with this email already exists
    const existingEmail = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check if a user with this username already exists
    const existingUsername = await database
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (existingUsername.length > 0) {
      return NextResponse.json(
        { error: "This username is already taken" },
        { status: 409 }
      );
    }

    // Hasing the password with bcrypt before saving it to the database
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert the new user into the database and get the created user back (including the generated userId)
    const [user] = await database
      .insert(usersTable)
      .values({
        firstName,
        lastName,
        username,
        email,
        passwordHash,
        dateOfBirth: new Date(dateOfBirth),
        height,
        heightUnit,
        weight,
        weightUnit,
      })
      .returning();

      //inserts default profiles into the database
      await createDefaultWorkoutsForUser(user.userId);

    // Create a JWT token so the user is immediately logged in
    const token = createToken({
      userId: user.userId,
      email: user.email,
      username: user.username,
    });

    // Frontend needs the token to log the user in, and also some basic user info to display in the UI
    return NextResponse.json(
      {
        message: "Account created successfully!",
        token,
        user: {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
