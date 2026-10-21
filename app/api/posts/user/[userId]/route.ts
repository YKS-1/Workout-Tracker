import { database } from '@/drizzle';
import { usersTable } from '@/drizzle/schema';
import { getPostsByUserId } from '@/lib/posts';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Route: /api/posts/user/:userId
 * A backend API GET route (/api/posts/user/:userId) to fetch a list of all posts made by a specific user
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { userId: string } },
) {
	try {
		// Seek the userId from the request parameters
		const { userId } = await params;

		// Check if the userId actually exists on the request
		if (!userId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: the userId parameter is missing',
				},
				{ status: 400 },
			);
		}

		// Confirm if the provided userId is valid; that is, the userId account must be present on the database table
		const doesUserExist = await database
			.select()
			.from(usersTable)
			.where(eq(usersTable.userId, userId));

		// If invalid userId - return a 404 response
		if (!doesUserExist.length) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: invalid userId; No user found with the provided userId',
				},
				{ status: 404 },
			);
		}

		// On success case, fetch the posts with the userId and return a success response
		const postsByUser = await getPostsByUserId(userId);

		return NextResponse.json(
			{
				success: true,
				size: postsByUser.length,
				data: {
					posts: postsByUser,
				},
			},
			{ status: 200 },
		);
	} catch {
		// On any arbitrary error case, return a 500 response
		return NextResponse.json(
			{
				success: false,
				message:
					'Failed to fetch the posts created by the specific user due to an internal server error',
			},
			{ status: 500 },
		);
	}
}
