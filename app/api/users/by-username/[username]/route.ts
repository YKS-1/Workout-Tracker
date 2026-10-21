import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/drizzle';
import { usersTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

// This route lets us look up a user by their username 
// instead of by their userId, which is useful for public profiles
export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = await params;

    const [user] = await database
      .select({
        userId: usersTable.userId,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        username: usersTable.username,
        email: usersTable.email,
        dateOfBirth: usersTable.dateOfBirth,
        height: usersTable.height,
        heightUnit: usersTable.heightUnit,
        weight: usersTable.weight,
        weightUnit: usersTable.weightUnit,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Get profile by username error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
