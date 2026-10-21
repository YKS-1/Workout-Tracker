import { createComment, getCommentsByPostId } from '@/lib/comments';
import { getPostById } from '@/lib/posts';
import { getUserById } from '@/lib/users';
import { NextRequest, NextResponse } from 'next/server';

/**
 * A backend API request function to create a new comment
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: { postId: string } },
) {
	try {
		// Seek the required parameter(s) from the request
		const { postId } = await params;

		// Check if the postId parameter is missing from our request
		if (!postId) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The postId parameter value must be present in the request',
				},
				{ status: 400 },
			);
		}

		// Check if the post exists in the first place
		const doesPostExist = await getPostById(postId);
		if (doesPostExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The provided postId parameter value maps to a non-existent post',
				},
				{ status: 404 },
			);
		}

		type RequestBody = {
			authorId: string;
			content: string;
		};

		const requestBody: RequestBody = await request.json();

		// Check if the attributes for a comment, 'content' and 'authorId' are defined in the request body
		if (!requestBody?.content.trim() || !requestBody.authorId) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The authorId and content parameter attributes must be present in the request body',
				},
				{ status: 400 },
			);
		}

		// If the comment's content is over the 250 character limit, return the appropriate response
		if (requestBody.content.length > 250) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The maximum character length of a comment must not exceed 250 characters',
				},
				{ status: 400 },
			);
		}

		// Check if the provided authorId is valid - i.e check if the user account exists
		const doesUserExist = await getUserById(requestBody.authorId);
		if (doesUserExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The provided authorId parameter value maps to a non-existent user',
				},
				{ status: 404 },
			);
		}

		// On all success to our validation
		// Create a new comment row on the posts_comment table using the previously defined utility helper function
		const newComment = await createComment(
			requestBody.authorId,
			postId,
			requestBody.content,
		);

		// Send the success response with the newly created comment object within
		return NextResponse.json({
			success: true,
			data: {
				comment: newComment,
			},
		});
	} catch {
		// On any arbitrary error case, send the error response to the user with a message
		return NextResponse.json(
			{
				success: false,
				message:
					'Error: There was an error while creating the comment due to an internal server error',
			},
			{ status: 500 },
		);
	}
}

/**
 * A backend API request function to fetch a list of comments made for a specific post
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { postId: string } },
) {
	try {
		// Seek the required parameter(s) from the request
		const { postId } = await params;

		// Check if the postId parameter is present within the request
		if (!postId) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The postId parameter value must be present in the request',
				},
				{ status: 400 },
			);
		}

		// Validate if the provided postId attribute is correct by verifying a post exists with that ID
		const doesPostExist = await getPostById(postId);
		if (doesPostExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The provided postId parameter maps to a non-existent post',
				},
				{ status: 404 },
			);
		}

		// Retrieve a list of comments from that specified post
		// Can be 0..n
		const commentsForPostId = await getCommentsByPostId(postId);
		return NextResponse.json({
			success: true,
			size: commentsForPostId.length,
			data: {
				comments: commentsForPostId,
			},
		});
	} catch {
		// On any arbitrary error case, return a nicely formatted error response with a message
		return NextResponse.json(
			{
				success: false,
				message:
					'Error: There was an error while fetching the comments due to an internal server error',
			},
			{ status: 500 },
		);
	}
}
