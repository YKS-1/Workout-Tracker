export default async function getFriendshipStatus(
	userId: string,
	friendId: string,
) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/friends/requests?userId=${userId}&friendId=${friendId}`,
		);

		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		const response = await request.json();

		interface Data {
			friends: {
				createdAt: string;
				id: string;
				receiverId: string;
				requesterId: string;
				status: 'accepted' | 'rejected' | 'pending';
				updatedAt: string;
			}[];
		}

		const data: Data = {
			friends: response?.data?.friendship,
		};

		return data;
	} catch {
		return null;
	}
}
