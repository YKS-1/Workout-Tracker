import { database } from '@/drizzle';
import { friendshipsTable, usersTable } from '@/drizzle/schema';
import { createFriendship, getFriendshipStatus } from '@/lib/friends';
import { getUserById } from '@/lib/users';
import { and, eq, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * A backend API request route to send a friend request from one user to another different user
 */
export async function POST(request: NextRequest) {
	try {
		// RequestBody Type for better support
		type RequestBody = {
			requesterId: string;
			receiverUsername: string;
		};

		const requestBody: RequestBody = await request.json();

		// Check if the receiverUsername and requesterId parameters are available on the request body
		if (!requestBody?.receiverUsername || !requestBody?.requesterId) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The requesterId and receiverUsername attributes must be present in the request body',
				},
				{ status: 400 },
			);
		}

		// Deconstruct the required attributes - at this stage they must be present
		const { receiverUsername, requesterId } = requestBody;

		// Check if the requesterId parameter maps to a valid existing user
		const requesterUser = await getUserById(requesterId);
		if (requesterUser.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: Provided requesterId parameter maps to a non-existent user',
				},
				{ status: 404 },
			);
		}

		// Check if the receiverUsername parameter maps to a valid existing user
		const receiverUser = await database
			.select()
			.from(usersTable)
			.where(eq(usersTable.username, receiverUsername));

		if (receiverUser.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: Provided receiverUsername parameter maps to a non-existent user',
				},
				{ status: 404 },
			);
		}

		const receiverId = receiverUser?.at(0)?.userId as string;

		// Ensure the user requesting and receiving are different and unique users
		if (requesterId === receiverId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: Cannot send a friend request to yourself',
				},
				{ status: 405 },
			);
		}

		// Check if they are already friends - then nothing to do so return an error response
		const doesFriendshipExist = await database
			.select()
			.from(friendshipsTable)
			.where(
				or(
					and(
						eq(friendshipsTable.requesterId, requesterId),
						eq(friendshipsTable.receiverId, receiverId),
					),
					and(
						eq(friendshipsTable.requesterId, receiverId),
						eq(friendshipsTable.receiverId, requesterId),
					),
				),
			)
			.limit(1);

		if (doesFriendshipExist.length > 0) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: Friendship already exists',
				},
				{ status: 400 },
			);
		}

		// If all other checks are passed, then correctly create a friendship relationship between the two users
		// Insert a new row to the friendships database table and return a success response
		const sendFriendRequest = await createFriendship(requesterId, receiverId);
		return NextResponse.json(
			{
				success: true,
				message: 'Success. Friend request was sent successfully',
				data: {
					friends: sendFriendRequest,
				},
			},
			{ status: 201 },
		);
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
 * A backend API request that returns the friendship status between two users
 * It can either be pending, rejected or accepted
 */
export async function GET(request: NextRequest) {
	try {
		// For a GET request, use the search params query parameters to pass information
		const userId = request?.nextUrl?.searchParams?.get('userId') ?? null;
		const friendId = request?.nextUrl?.searchParams?.get('friendId') ?? null;

		// Check if the userId and friendId is present in the search params
		if (!friendId || !userId) {
			return NextResponse.json({
				success: false,
				message:
					'Error: Missing the query properties userId and friendId in the search parameters',
			});
		}

		// Ensure the provided userId and friendId map to existing users
		const doesUserExist = await getUserById(userId);
		const doesFriendExist = await getUserById(friendId);

		if (doesUserExist?.length === 0 || doesFriendExist?.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The provided userId or friendId maps to a non-existent user entity',
				},
				{ status: 404 },
			);
		}

		// Get the friendship status between the two users and return
		const friendshipStatus = await getFriendshipStatus(userId, friendId);

		return NextResponse.json({
			success: true,
			data: {
				friendship: friendshipStatus,
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
