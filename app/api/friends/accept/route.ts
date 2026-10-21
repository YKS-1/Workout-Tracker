import {
	acceptAsFriend,
	doesFriendRequestExist,
	isFriendRequestResolved,
} from '@/lib/friends';
import { NextRequest, NextResponse } from 'next/server';

/**
 * A backend API request route that allows the user to accept an existing friend request that was sent to them
 */
export async function POST(request: NextRequest) {
	try {
		// A sample custom RequestBody type for better support
		type RequestBody = {
			requestId: string;
			receiverId: string;
		};

		// Check if the requestId attribute is present in the request body
		const requestBody: RequestBody = await request.json();

		if (!requestBody.requestId || !requestBody.receiverId) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The request body must have the requestId and receiverId attribute',
				},
				{ status: 400 },
			);
		}

		// Deconstructing required attribute fields
		const { requestId, receiverId } = requestBody;

		// Ensure the provided requestId is valid - check if the friend request is previously sent already
		const doesRequestExist = await doesFriendRequestExist(requestId);

		if (doesRequestExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The provided requestId maps to a non-existent friend request',
				},
				{ status: 404 },
			);
		}

		// Check if the receiverId matches the actual receiverId stored on the request - ensuring the right user can accept it
		if (doesRequestExist?.at(0)?.receiverId !== receiverId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: You are forbidden to accept this friend request',
				},
				{ status: 403 },
			);
		}

		// If the friend request is already resolved - that is, if the friend request was already previously accepted or rejected
		// A friend request can be accepted only when it has the status of 'pending'
		const isRequestResolved = await isFriendRequestResolved(requestId);

		if (isRequestResolved.length > 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: Cannot accept the request with the friendships status already resolved (accepted/rejected)',
				},
				{ status: 400 },
			);
		}

		// If the request exists and it is still unresolved (that is, the status is 'pending')
		// Then accept the friend request - update the friendship status to 'accepted'
		const acceptFriendRequest = await acceptAsFriend(requestId);
		return NextResponse.json({
			success: true,
			message: 'Successfully accepted the friend request',
			data: {
				request: acceptFriendRequest,
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
