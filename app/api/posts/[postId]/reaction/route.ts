import { database } from '@/drizzle';
import { postLikesTable, postsTable, usersTable } from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Route: /api/posts/:postId/reaction
 * Method: POST
 * A backend API route that alternatively toggles the like/unlike functionality for a given post
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: { postId: string } },
) {
	try {
		// Retrieve the postId from the route parameter(s) and check if it exists
		const { postId } = await params;
		if (!postId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: Missing postId parameter value in the request',
				},
				{ status: 400 },
			);
		}

		// Check if the post even exists
		const doesPostExist = await database
			.select()
			.from(postsTable)
			.where(eq(postsTable.id, postId));
		if (doesPostExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: Provided postId parameter maps to a non-existent post',
				},
				{ status: 404 },
			);
		}

		// Setting up the request body type for better TypeScript/editor support
		type RequestBody = {
			userId: string;
		};

		// Check if the userId attribute is present in the request body
		const requestBody: RequestBody = await request.json();

		if (!requestBody.userId) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: Missing userId parameter attribute in the request body',
				},
				{ status: 401 },
			);
		}

		// Check if the userId maps to an existing user
		const doesUserExist = await database
			.select()
			.from(usersTable)
			.where(eq(usersTable.userId, requestBody.userId));
		if (doesUserExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: Provided userId parameter maps to a non-existent user account',
				},
				{
					status: 404,
				},
			);
		}

		// From the 'post_likes' table; see if the post is already liked by the user in question
		const existingLike = await database
			.select()
			.from(postLikesTable)
			.where(
				and(
					eq(postLikesTable.userId, requestBody.userId),
					eq(postLikesTable.postId, postId),
				),
			)
			.limit(1);

		// If the user has liked it - unlike it, else like it
		let liked;

		if (existingLike.length > 0) {
			// Unlike the post
			await database
				.delete(postLikesTable)
				.where(
					and(
						eq(postLikesTable.userId, requestBody.userId),
						eq(postLikesTable.postId, postId),
					),
				);

			liked = false;
		} else {
			// Like the post
			await database.insert(postLikesTable).values({
				userId: requestBody.userId,
				postId,
			});
			liked = true;
		}

		// Return a success response with the latest reaction value
		return NextResponse.json({
			success: true,
			data: {
				post: postId,
				user: requestBody.userId,
				liked,
			},
		});
	} catch (error) {
		console.log(error);
		return NextResponse.json(
			{
				success: false,
				message:
					'Error: Failed to send a request to like/unlike post due to an internal server error',
			},
			{ status: 500 },
		);
	}
}
