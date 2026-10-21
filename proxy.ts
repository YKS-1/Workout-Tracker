import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from './lib/auth';

/**
 * Default function to check if the login token auth is present in the headers
 * If not present or invalid, return with 401
 * If valid, move to actual request
 */
export async function proxy(request: NextRequest) {
	const tokenPayload = getTokenFromRequest(request);

	if (!tokenPayload) {
		return NextResponse.json(
			{
				success: false,
				error: 'Unauthorized. Please log in.',
			},
			{ status: 401 },
		);
	}

	const updatedRequestHeaders = new Headers(request.headers);
	updatedRequestHeaders.set('x-user-id', tokenPayload.userId);

	return NextResponse.next({
		request: {
			headers: updatedRequestHeaders,
		},
	});
}

// This is the path(s) that are protected by the login auth
// All paths included below will require login (token) to be sent in the headers to perform the actual request action
// Include relevant API path you wish to protect with auth (login) here
export const config = {
	matcher: [],
};
