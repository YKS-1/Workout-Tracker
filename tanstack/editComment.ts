export default async function editComment(
	postId: string,
	commentId: string,
	content: string,
) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/posts/${postId}/comments/${commentId}`,
			{
				method: 'PATCH',
				headers: {
					'Content-type': 'application/json',
				},
				body: JSON.stringify({
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
		const comment = response?.data?.comment ?? {};
		return comment;
	} catch {
		return null;
	}
}
