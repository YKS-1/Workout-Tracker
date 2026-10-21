import {
	doesFriendRequestExist,
	isFriendRequestResolved,
	rejectFriendRequest,
} from '@/lib/friends';
import { NextRequest, NextResponse } from 'next/server';

/**
 * A backend API request route that allows the user to reject an incoming friend request sent to them
 */
export async function POST(request: NextRequest) {
	try {
		// A sample custom RequestBody type for better type support within
		type RequestBody = {
			requestId: string;
			receiverId: string;
		};

		// Check if the requestId and receiverId are present on the request body
		const requestBody: RequestBody = await request.json();

		if (!requestBody?.receiverId || !requestBody?.requestId) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The request body must have the requestId and receiverId attributes',
				},
				{ status: 400 },
			);
		}

		// Deconstruct the parameters when its sure that they exist on the request body
		const { requestId, receiverId } = requestBody;

		// Check if the friend request exists in the first place (cannot be an invalid requestId)
		const doesRequestExist = await doesFriendRequestExist(requestId);
		if (doesRequestExist?.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The provided requestId parameter maps to a non-existent friend request',
				},
				{ status: 404 },
			);
		}

		// Make sure the the correct receiver can make friendship status changes, that is, the receiverId must match in the friend request
		if (doesRequestExist?.at(0)?.receiverId !== receiverId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: You are forbidden to reject this friend request',
				},
				{ status: 403 },
			);
		}

		// Cannot reject a friend request that was already previously accepted or rejected; It must be in a 'pending' status only
		const isRequestResolved = await isFriendRequestResolved(requestId);
		if (isRequestResolved?.length > 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: Cannot reject the request with the friendship status already resolved (accepted/rejected)',
				},
				{ status: 400 },
			);
		}

		// On passing all other conditional checks, use the provided information to reject the friend request
		// Updates the 'status' in the friend request to 'rejected'
		const rejectIncomingRequest = await rejectFriendRequest(requestId);
		return NextResponse.json({
			success: true,
			message: 'Successfully rejected the friend request',
			data: {
				request: rejectIncomingRequest,
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
