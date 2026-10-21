import { getFriendRequestsForUserId } from '@/lib/friends';
import { getUserById } from '@/lib/users';
import { NextRequest, NextResponse } from 'next/server';

/**
 * A backend API request route to fetch the full list of friend requests sent to a specific user
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { userId: string } },
) {
	try {
		// Check if the userId parameter is present in the request
		const { userId } = await params;
		if (!userId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: The userId parameter is absent in the request',
				},
				{ status: 400 },
			);
		}

		// Check if the provided userId parameter is valid and a user actually exists
		const doesUserExist = await getUserById(userId);
		if (doesUserExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The provided userId parameter maps to a non-existent user',
				},
				{ status: 404 },
			);
		}

		// Get the full list of friend requests sent to that user with essential user details included
		// Joins the users table with the friendships table for combined information
		const friendRequests = await getFriendRequestsForUserId(userId);

		return NextResponse.json({
			success: true,
			size: friendRequests.length,
			data: {
				requests: friendRequests,
			},
		});
	} catch (error) {
		if (error instanceof Error) {
			console.log(error.name);
			console.log(error.message);
		}
		return NextResponse.json(
			{
				success: false,
				message:
					'Error: There was an internal server error while making this request',
			},
			{ status: 500 },
		);
	}
}
