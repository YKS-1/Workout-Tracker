import { Comment } from '@/interfaces/Comment';

export default async function deleteComment(postId: string, commentId: string) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/posts/${postId}/comments/${commentId}`,
			{
				method: 'DELETE',
			},
		);

		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		const response = await request.json();
		const comment: Comment = response?.data?.comment ?? {};
		return comment;
	} catch {
		return null;
	}
}
