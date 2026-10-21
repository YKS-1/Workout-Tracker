export default async function getPostReactions(
	postId: string,
	authorId: string,
) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/posts/${postId}/reaction/${authorId}`,
		);

		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		const response = await request.json();
		const data = {
			liked: response?.data?.liked,
			totalLikes: response?.data?.total?.length,
			list: response?.data?.total,
		};

		return data;
	} catch {
		return null;
	}
}
