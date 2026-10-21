export default async function searchUsers(username: string) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/users/username/${username}`,
		);

		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		const response = await request.json();

		interface Data {
			size: number;
			users: {
				userId: string;
				firstName: string;
				lastName: string;
				username: string;
				dateOfBirth: string;
			}[];
		}

		const data: Data = {
			size: response?.size,
			users: response?.data?.users,
		};

		return data;
	} catch {
		return null;
	}
}
