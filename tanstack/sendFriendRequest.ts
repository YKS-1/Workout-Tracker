export default async function sendFriendRequest(
	senderId: string,
	receiverUsername: string,
) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/friends/requests`,
			{
				method: 'POST',
				headers: {
					'Content-type': 'application/json',
				},
				body: JSON.stringify({
					requesterId: senderId,
					receiverUsername,
				}),
			},
		);

		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		const response = await request.json();
		console.log(response);
		const data = response?.data?.friends;
		return data;
	} catch {
		return null;
	}
}
