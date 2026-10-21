import { deletePostById, getPostById, updatePostById } from '@/lib/posts';
import { NextRequest, NextResponse } from 'next/server';

/**
 * A backend API GET route (/api/posts/[postId]) to retrieve individual post
 * using a unique post ID parameter, from the posts database table and return as a response
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { postId: string } },
) {
	try {
		// Seek the 'postId' from the request parameters
		const { postId } = await params;

		// If postId is missing
		if (!postId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: postId parameter attribute is missing',
				},
				{ status: 400 },
			);
		}

		// Use the helper function to make the query and fetch the post from the database
		const post = await getPostById(postId);

		// In the case that the post does not exist (wrong ID)
		if (!post || post.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message: 'Post not found',
				},
				{ status: 404 },
			);
		}

		// Post exists:
		return NextResponse.json(
			{
				success: true,
				data: {
					post: post.at(0),
				},
			},
			{ status: 200 },
		);
	} catch {
		// On an arbitrary error case, return a response with 500 status code
		return NextResponse.json(
			{
				success: false,
				message:
					'Error: Failed to fetch post by the ID due to an internal server error',
			},
			{
				status: 500,
			},
		);
	}
}

/**
 * A backend API PATCH route (/api/posts/[postId]) to update the attributes of an existing post
 * This route can be used to only updated the 'title' and the 'description' attributes of the post
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: { postId: string } },
) {
	try {
		// Seek the 'postId' parameter and the request body for potential 'title' and 'description' attributes
		const { postId } = await params;
		const requestBody = await request.json();

		// Check if the postId is not present
		if (!postId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: postId parameter attribute is missing',
				},
				{ status: 400 },
			);
		}

		// Check if the provided postId is valid
		// That is, check if the post already exists using the getPostById helper function
		const doesPostExist = await getPostById(postId);

		// If unavailable post or invalid postId - return a 404 response
		if (!doesPostExist.length) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: Invalid postId; no posts exists with the provided ID parameter',
				},
				{ status: 404 },
			);
		}

		// Use the helper function 'updatePostById' to update the provided attributes
		// If attributes are not provided/defined, pass as null (the helper function handles null case as necessary)
		const updatedPost = await updatePostById(postId, {
			title: requestBody.title || null,
			description: requestBody.description || null,
		});

		// Final success response returning the updated post
		return NextResponse.json({
			success: true,
			data: {
				post: updatedPost.at(0),
			},
		});
	} catch {
		// On any arbitrary error case, return a 500 response
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to update post due to an internal server error',
			},
			{ status: 500 },
		);
	}
}

/**
 * A backend API DELETE route (/api/posts/[postId]) to delete an existing post with the provided postId parameter
 * Requires an authorId entry in the request body with valid authorId to ensure the right user can delete their post
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { postId: string } },
) {
	try {
		// Seek the 'postId' attribute from the request parameter and retrieve the requestBody for authorId attribute
		const { postId } = await params;
		const requestBody = await request.json();

		// Check if the postId is unavailable - return a 400 response if absent
		if (!postId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: postId parameter attribute is missing',
				},
				{ status: 400 },
			);
		}

		// Check if the authorId is unavailable in the request body - return a 400 response if absent
		if (!requestBody?.authorId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: authorId is required in the request body',
				},
				{ status: 400 },
			);
		}

		// Confirm whether the post exists (to be deleted)
		// Using the helper function 'getPostById'
		const doesPostExist = await getPostById(postId);

		// If the post does not exist - return a 404 response
		if (!doesPostExist.length) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: no post was found with the provided postId',
				},
				{ status: 404 },
			);
		}

		// Check if the user owns the post (the user must have created the post to delete it)
		// If the post's authorId does not match provided authorId in request body - return a 403 response
		if (doesPostExist.at(0)?.authorId !== requestBody.authorId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Error: delete action is forbidden for your authorId',
				},
				{ status: 403 },
			);
		}

		// Finally, if all checks are completed and passed, delete the post and return deleted post in the response
		const deletedPost = await deletePostById(postId);

		return NextResponse.json({
			success: true,
			data: {
				post: deletedPost?.at(0),
			},
		});
	} catch {
		// On any arbitrary error case, return a 500 response
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to delete post due to an internal server error',
			},
			{ status: 500 },
		);
	}
}
