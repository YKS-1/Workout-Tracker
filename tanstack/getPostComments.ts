import { Comment } from '@/interfaces/Comment';

export default async function getPostComments(postId: string) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/posts/${postId}/comments`,
		);

		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		const response = await request.json();
		const data: {
			size: number;
			comments: Comment[];
		} = {
			size: response?.size ?? 0,
			comments: response?.data?.comments ?? [],
		};

		return data;
	} catch {
		return null;
	}
}
