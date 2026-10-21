import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, or } from 'drizzle-orm';
import { database } from '@/drizzle';
import { usersTable } from '@/drizzle/schema';
import { getTokenFromRequest } from '@/lib/auth';
import { getUserById } from '@/lib/users';

// Defines which fields a user is allowed to update, and validates their format.
// All fields are optional — users can update one or many at a time.
const updateProfileSchema = z.object({
	firstName: z.string().min(1, 'First name cannot be empty').max(50).optional(),
	lastName: z.string().min(1, 'Last name cannot be empty').max(50).optional(),
	username: z.string().min(1, 'Username cannot be empty').max(50).optional(),
	email: z.string().email('Invalid email address').optional(),
	dateOfBirth: z.string().date('Invalid date of birth').optional(),
	height: z.number().positive('Height must be a positive number').optional(),
	heightUnit: z
		.enum(['cm', 'ft'], { message: "Height unit must be 'cm' or 'ft'" })
		.optional(),
	weight: z.number().positive('Weight must be a positive number').optional(),
	weightUnit: z
		.enum(['kg', 'lbs'], { message: "Weight unit must be 'kg' or 'lbs'" })
		.optional(),
});

// Extracting the profile fields into a shared constant so we don't repeat
// the same list of columns in both the GET and PATCH handlers (DRY principle).
const profileFields = {
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
};

interface ParamsOptions {
	params: {
		userId: string;
	};
}

function getAuthorizedUserId(req: NextRequest) {
	return req.headers.get('x-user-id') ?? getTokenFromRequest(req)?.userId ?? null;
}

// Runs when someone sends a GET request to /api/user/profile
// Returns the authenticated user's profile information
export async function GET(req: NextRequest, { params }: ParamsOptions) {
	try {
		const { userId } = await params;

		// Check if the userId param is not present
		if (!userId) {
			return NextResponse.json(
				{
					success: false,
					error: 'Error: The userId parameter must be present',
				},
				{ status: 400 },
			);
		}

		// Look up the user in the database using the ID from the token
		const [user] = await database
			.select(profileFields)
			.from(usersTable)
			.where(eq(usersTable.userId, userId))
			.limit(1);

		if (!user) {
			return NextResponse.json({ error: 'User not found.' }, { status: 404 });
		}

		return NextResponse.json({ user }, { status: 200 });
	} catch (error) {
		console.error('Get profile error:', error);
		return NextResponse.json(
			{ error: 'Something went wrong. Please try again.' },
			{ status: 500 },
		);
	}
}

// Runs when someone sends a PATCH request to /api/user/profile
// Updates only the fields the user provides — a partial update, which is what PATCH is for.
// PUT would mean replacing the entire profile, requiring all fields to be sent every time.
export async function PATCH(req: NextRequest, { params }: ParamsOptions) {
	try {
		const { userId } = await params;

		// Check if the userId param is not present
		if (!userId) {
			return NextResponse.json(
				{
					success: false,
					error: 'Error: The userId parameter must be present',
				},
				{ status: 400 },
			);
		}

		const authorizedUserId = getAuthorizedUserId(req);
		if (!authorizedUserId || userId !== authorizedUserId) {
			return NextResponse.json(
				{
					success: false,
					error: 'Forbidden. Cannot access forbidden account',
				},
				{ status: 403 },
			);
		}

		const body = await req.json();

		// If the validation fails, return a 400 Bad Request with the first error message
		const validation = updateProfileSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.error.issues[0].message },
				{ status: 400 },
			);
		}

		// Reject the request if no valid fields were actually provided.
		// Note: Zod strips unknown fields, so if someone sends only unrecognized
		// fields (e.g. { "foo": "bar" }), validation.data will be empty.
		if (Object.keys(validation.data).length === 0) {
			return NextResponse.json(
				{ error: 'No valid fields provided to update.' },
				{ status: 400 },
			);
		}

		const { username, email } = validation.data;

		// If the user wants to change their username or email, check both in a
		// single query rather than two separate ones. This is more efficient and
		// reduces the number of round trips to the database.
		if (username || email) {
			const conditions = [];
			if (username) conditions.push(eq(usersTable.username, username));
			if (email) conditions.push(eq(usersTable.email, email));

			const [conflict] = await database
				.select({
					userId: usersTable.userId,
					username: usersTable.username,
					email: usersTable.email,
				})
				.from(usersTable)
				.where(or(...conditions))
				.limit(1);

			// If a conflict exists and it belongs to a different user, reject the request.
			// We check which specific field caused the conflict to give a helpful error message.
			if (conflict && conflict.userId !== userId) {
				if (username && conflict.username === username) {
					return NextResponse.json(
						{ error: 'Username is already taken.' },
						{ status: 409 },
					);
				}
				if (email && conflict.email === email) {
					return NextResponse.json(
						{ error: 'Email is already in use.' },
						{ status: 409 },
					);
				}
			}
		}

		// Apply the updates and return the updated profile.
		// We also handle the case where the update finds no matching user —
		// this is unlikely but possible if the account was deleted after login.
		const [updatedUser] = await database
			.update(usersTable)
			.set(validation.data)
			.where(eq(usersTable.userId, userId))
			.returning(profileFields);

		if (!updatedUser) {
			return NextResponse.json({ error: 'User not found.' }, { status: 404 });
		}

		return NextResponse.json(
			{ message: 'Profile updated successfully!', user: updatedUser },
			{ status: 200 },
		);
	} catch (error) {
		// Even though we check for conflicts above, there's a small window where
		// two requests could pass the check at the same time (race condition).
		// Since the database has unique constraints on username and email,
		// it will throw an error if that happens. We catch it here as a safety net.
		if (
			typeof error === 'object' &&
			error !== null &&
			'code' in error &&
			(error as { code: string }).code === '23505'
		) {
			return NextResponse.json(
				{ error: 'Username or email is already in use.' },
				{ status: 409 },
			);
		}

		console.error('Update profile error:', error);
		return NextResponse.json(
			{ error: 'Something went wrong. Please try again.' },
			{ status: 500 },
		);
	}
}

// Runs when someone sends a DELETE request to /api/user/account
// Permanently deletes the authenticated user's account from the database
export async function DELETE(req: NextRequest, { params }: ParamsOptions) {
	try {
		const { userId } = await params;

		// Check if the userId param is not present
		if (!userId) {
			return NextResponse.json(
				{
					success: false,
					error: 'Error: The userId parameter must be present',
				},
				{ status: 400 },
			);
		}

		const authorizedUserId = getAuthorizedUserId(req);
		if (!authorizedUserId || userId !== authorizedUserId) {
			return NextResponse.json(
				{
					success: false,
					error: 'Forbidden. Cannot access forbidden account',
				},
				{ status: 403 },
			);
		}

		const doesUserExist = await getUserById(userId);
		if (doesUserExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error: 'Error: No user found with the provided userId parameter',
				},
				{ status: 404 },
			);
		}

		// Delete the user from the database and return the deleted row.
		// .returning() is used so we can confirm something was actually deleted —
		// if it comes back empty, the user didn't exist in the first place.
		const [deletedUser] = await database
			.delete(usersTable)
			.where(eq(usersTable.userId, userId))
			.returning({ userId: usersTable.userId });

		if (!deletedUser) {
			return NextResponse.json({ error: 'User not found.' }, { status: 404 });
		}

		return NextResponse.json(
			{ message: 'Account deleted successfully.' },
			{ status: 200 },
		);
	} catch (error) {
		console.error('Delete account error:', error);
		return NextResponse.json(
			{ error: 'Something went wrong. Please try again.' },
			{ status: 500 },
		);
	}
}
