import { Post } from '@/interfaces/Post';

export default async function editPost(
	postId: string,
	updatedPost: Partial<Post>,
) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/posts/${postId}`,
			{
				method: 'PATCH',
				headers: {
					'Content-type': 'application/json',
				},
				body: JSON.stringify(updatedPost),
			},
		);

		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		const response = await request.json();
		const post: Post = response?.data?.post ?? {};
		return post;
	} catch {
		return null;
	}
}
