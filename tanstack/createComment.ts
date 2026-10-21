import { Comment } from '@/interfaces/Comment';

export default async function createComment(
	postId: string,
	authorId: string,
	content: string,
) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/posts/${postId}/comments`,
			{
				method: 'POST',
				headers: {
					'Content-type': 'application/json',
				},
				body: JSON.stringify({
					authorId,
					content,
				}),
			},
		);

		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		const response = await request.json();
		const comment = (response?.data?.comment as Comment) ?? {};
		return comment;
	} catch {
		return null;
	}
}
