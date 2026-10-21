import { User } from '@/interfaces/User';

export default async function getUser(userId: string) {
	try {
		const request = await fetch(
			`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/users/${userId}`,
		);

		if (!request.ok) {
			throw new Error(
				'Error: There was an error while making a request to the backend',
			);
		}

		const response = await request.json();
		const user: User = response?.user ?? {};

		return user;
	} catch {
		return null;
	}
}
