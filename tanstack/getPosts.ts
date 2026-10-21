import { Post } from '@/interfaces/Post';

export default async function getPosts() {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/posts`,
		);
		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		const response = await request.json();
		if (!response?.success) {
			throw new Error(
				response?.message ||
					'Error: There was an error while making request to the backend',
			);
		}

		const posts: Post[] = response?.data?.posts ?? [];
		return posts;
	} catch {
		return null;
	}
}
