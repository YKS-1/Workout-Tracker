import { Friend } from "@/interfaces/Friend";

export default async function getFriendsList(userId: string) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/friends/${userId}`,
		);

		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		type Data = {
			size: number;
			friends: Friend[]
		};

		const response = await request.json();
		const data: Data = {
			size: response?.size,
			friends: response?.data?.friends,
		};

		return data;
	} catch {
		return null;
	}
}
