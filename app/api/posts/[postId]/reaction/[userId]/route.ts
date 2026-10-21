import { database } from '@/drizzle';
import { postLikesTable, postsTable, usersTable } from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

interface GetParams {
	params: {
		postId: string;
		userId: string;
	};
}

export async function GET(request: NextRequest, { params }: GetParams) {
	try {
		// Check if the userId and postId parameter attributes are provided to us in the request
		const { userId, postId } = await params;
		if (!userId || !postId) {
			return NextResponse.json({
				success: false,
				message:
					'Error: Missing the userId and postId parameter values in the request',
			});
		}

		// Check if the user exists
		const doesUserExist = await database
			.select()
			.from(usersTable)
			.where(eq(usersTable.userId, userId));
		if (doesUserExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: Provided userId parameter value maps to a non-existent user',
				},
				{ status: 404 },
			);
		}

		// Check if the post exists
		const doesPostExist = await database
			.select()
			.from(postsTable)
			.where(eq(postsTable.id, postId));
		if (doesPostExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: Provided postId parameter value maps to a non-existent post',
				},
				{ status: 404 },
			);
		}

		// See if the corresponding row exists in the 'post_likes' table with the provided userId and postId
		// If it exists = liked; else = not liked
		const isLiked = await database
			.select()
			.from(postLikesTable)
			.where(
				and(
					eq(postLikesTable.postId, postId),
					eq(postLikesTable.userId, userId),
				),
			);

		const listOfLikes = await database
			.select({
				userId: usersTable.userId,
				username: usersTable.username,
			})
			.from(postLikesTable)
			.innerJoin(usersTable, eq(postLikesTable.userId, usersTable.userId))
			.where(eq(postLikesTable.postId, postId));

		return NextResponse.json({
			success: true,
			data: {
				postId,
				userId,
				liked: isLiked.length === 1,
				total: listOfLikes,
			},
		});
	} catch {
		// Send an error response on any arbitrary error case within the server
		return NextResponse.json(
			{
				success: false,
				message:
					'Error: There was a server error while fetching the user list for the likes on a post',
			},
			{ status: 500 },
		);
	}
}
