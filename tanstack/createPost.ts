import { Post } from '@/interfaces/Post';

interface CreatePostType {
	title: string;
	description: string;
	authorId: string;
}

export default async function createPost(post: CreatePostType) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/posts`,
			{
				method: 'POST',
				headers: {
					'Content-type': 'application/json',
				},
				body: JSON.stringify(post),
			},
		);

		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		const response = await request.json();
		const newPost: Post = response?.data?.post ?? {};
		return newPost;
	} catch {
		return null;
	}
}
