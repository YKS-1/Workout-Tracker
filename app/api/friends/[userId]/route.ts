import {
	areUsersFriends,
	getFriendsForUserId,
	removeFriend,
} from '@/lib/friends';
import { getUserById } from '@/lib/users';
import { NextRequest, NextResponse } from 'next/server';

/**
 * A backend API request route that returns a full list of friends for a specific user
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { userId: string } },
) {
	try {
		// Retrieve the userId parameter from the request and check if it exists promptly
		const { userId } = await params;
		if (!userId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: Missing the userId parameter in the request',
				},
				{ status: 400 },
			);
		}

		// Ensure the provided userId actually maps to a created user stored in the users table
		const doesUserExist = await getUserById(userId);
		if (doesUserExist?.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The provided userId parameter maps to a non-existent user',
				},
				{ status: 404 },
			);
		}

		// Use the provided userId to make a query to fetch all friends from the friendships table
		// Selects only the safe and required attributes/properties for both tables keeping the API safe and private
		const friendsList = await getFriendsForUserId(userId);
		return NextResponse.json({
			success: true,
			size: friendsList?.length,
			data: {
				friends: friendsList,
			},
		});
	} catch (error) {
		if (error instanceof Error) {
			console.log(error?.name);
			console.log(error?.message);
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

/**
 * A backend API request route that deletes the friendship relationship between two users (existing friends)
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { userId: string } },
) {
	try {
		// Get the userId from the parameters list and ensure it is present
		const { userId } = await params;
		if (!userId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: The userId parameter is missing',
				},
				{ status: 400 },
			);
		}

		// Sample RequestBody type
		type RequestBody = {
			friendId: string;
		};

		// Check if the request body contains the friendId attribute within
		const requestBody: RequestBody = await request.json();
		if (!requestBody?.friendId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: friendId parameter is missing in the request body',
				},
				{ status: 400 },
			);
		}

		const { friendId } = requestBody;

		// Check if both the user and the friend exist through their IDs
		const doesUserExist = await getUserById(userId);
		const doesFriendUserExist = await getUserById(friendId);

		if (doesUserExist?.length === 0 || doesFriendUserExist?.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The provided userId/friendId parameter maps to a non-existent user',
				},
				{ status: 404 },
			);
		}

		// Ensure the two users in question are actually friends (status must be 'accepted' for their friendship)
		const isFriendshipValid = await areUsersFriends(userId, friendId);
		if (isFriendshipValid?.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: Cannot unfriend from user who is not an existing friend',
				},
				{ status: 400 },
			);
		}

		// Perform the actual functionality to remove the friendship between the two users
		const unfriendUser = await removeFriend(userId, friendId);

		return NextResponse.json({
			success: true,
			message: 'Successfully unfriended the provided friendId',
			data: {
				request: unfriendUser,
			},
		});
	} catch (error) {
		if (error instanceof Error) {
			console.log(error?.name);
			console.log(error?.message);
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
