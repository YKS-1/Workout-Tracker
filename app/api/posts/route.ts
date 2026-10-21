import { createPost, getAllPosts } from '@/lib/posts';
import { NextRequest, NextResponse } from 'next/server';

/**
 * A backend API POST route (/api/posts) to validate and create new post on the posts table database
 */
export async function POST(request: NextRequest) {
	try {
		const requestBody = await request.json();

		// Validate the incoming body request
		// Request body must have: title (string), authorId (UUID), description (string)
		// The attributes cannot be missing or empty
		if (
			!requestBody.title ||
			!requestBody.description ||
			!requestBody.authorId
		) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Failed to create new post; Required fields: authorId, title, description.',
				},
				{ status: 400 },
			);
		}

		// Check for empty attributes (title & description)
		if (
			requestBody.title.length === 0 ||
			requestBody.description.length === 0
		) {
			return NextResponse.json(
				{
					success: false,
					message: 'Post title and description attributes cannot be empty',
				},
				{ status: 400 },
			);
		}

		// Post insertion on the local database setup
		const newPost = await createPost(
			requestBody.authorId,
			requestBody.title,
			requestBody.description,
		);
		return NextResponse.json(newPost.at(0), { status: 201 });
	} catch {
		// On any arbitrary error case, return a 500 response
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to create new post due to an internal server error',
			},
			{ status: 500 },
		);
	}
}

/**
 * A backend API GET route (/api/posts) to retrieve all posts from the posts database table and return to user
 * Posts are sorted by the createdAt date
 */
export async function GET() {
	try {
		// Fetch all posts from the utility helper
		const posts = await getAllPosts();

		// Send as a formatted response
		return NextResponse.json(
			{
				success: true,
				size: posts.length,
				data: {
					posts,
				},
			},
			{ status: 200 },
		);
	} catch {
		// On an arbitrary error case, return a response with 500 status code
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to fetch all posts due to an internal server error',
			},
			{ status: 500 },
		);
	}
}
