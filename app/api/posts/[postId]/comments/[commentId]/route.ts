import {
	deleteCommentById,
	getCommentById,
	updateCommentContent,
} from '@/lib/comments';
import { getPostById } from '@/lib/posts';
import { NextRequest, NextResponse } from 'next/server';

interface ParamsOptions {
	params: {
		postId: string;
		commentId: string;
	};
}

/**
 * A backend API request route to update an existing comment
 */
export async function PATCH(request: NextRequest, { params }: ParamsOptions) {
	try {
		// Seek the multiple parameter values
		const { postId, commentId } = await params;

		// Check if both the parameter values are present correctly
		if (!postId || !commentId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: Missing the parameters postId and commentId',
				},
				{ status: 400 },
			);
		}

		// Check if the provided postId's post actually exists
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

		// Check if the provided commentId's comment actually exists
		const doesCommentExist = await getCommentById(commentId);
		if (doesCommentExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The provided commentId parameter value maps to a non-existent comment',
				},
				{ status: 404 },
			);
		}

		// Retrieve the 'content' property on the comment from the request body, ensure it is present and adheres to the character limit
		type RequestBody = {
			content: string;
		};
		const requestBody: RequestBody = await request.json();
		const MAX_COMMENT_CONTENT_LENGTH = 250;

		if (
			!requestBody?.content.trim() ||
			requestBody.content.length > MAX_COMMENT_CONTENT_LENGTH
		) {
			return NextResponse.json(
				{
					success: false,
					message:
						"Error: The 'content' attribute must be present in the request body and can be at most 250 characters",
				},
				{ status: 400 },
			);
		}

		// Finally, on all successful checks, update the actual comment's content value
		const updatedComment = await updateCommentContent(
			commentId,
			requestBody.content.trim(),
		);

		// Successful response
		return NextResponse.json({
			success: true,
			data: {
				comment: updatedComment,
			},
		});
	} catch {
		// On any arbitrary error case, return a structured response with a message
		return NextResponse.json(
			{
				success: false,
				message:
					'Error: There was an internal server error while updating the specified comment on the post',
			},
			{ status: 500 },
		);
	}
}

/**
 * A backend API request route to delete an existing comment
 */
export async function DELETE(request: NextRequest, { params }: ParamsOptions) {
	try {
		// Seek the multiple parameter values
		const { postId, commentId } = await params;

		// Check if both the parameters are defined in the request and are available
		if (!postId || !commentId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: Missing the parameters postId and commentId',
				},
				{ status: 400 },
			);
		}

		// Check if the post exists on the database table
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

		// Check if the comment exists on the database table
		const doesCommentExist = await getCommentById(commentId);
		if (doesCommentExist.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The provided commentId parameter value maps to a non-existent comment',
				},
				{ status: 404 },
			);
		}

		// Perform the actual deletion of the comment and return the deleted comment within the response
		const deletedComment = await deleteCommentById(commentId);
		return NextResponse.json({
			success: true,
			data: {
				comment: deletedComment,
			},
		});
	} catch {
		// On any arbitrary error case, return a structured response with a message
		return NextResponse.json(
			{
				success: false,
				message:
					'Error: There was an internal server error while deleting the specified comment on the post',
			},
			{ status: 500 },
		);
	}
}
