import { getUsersByUsername } from '@/lib/users';
import { NextRequest, NextResponse } from 'next/server';

/**
 * A backend API request that returns a full list of all users that fully or partially matches a username query
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { username: string } },
) {
	try {
		// Retrieve the username from the parameters
		// Check if it exists + must be at least three characters long
		const { username } = await params;

		if (!username || username?.length < 3) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Error: The username parameter property must be at least three characters long',
				},
				{ status: 400 },
			);
		}

		// Use the previously defined helper function to get a full list of all users for the provided username
		const users = await getUsersByUsername(username?.toLowerCase());

		// Success response - no validation necessary for this API request
		return NextResponse.json({
			success: true,
			size: users?.length,
			data: {
				users,
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
