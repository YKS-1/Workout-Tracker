import { database } from '@/drizzle';
import { usersTable } from '@/drizzle/schema';
import { eq, like } from 'drizzle-orm';

/**
 * Utility function to make an SQL query through the Drizzle ORM
 * Makes the query to fetch a user by their ID from the users table
 */
export async function getUserById(userId: string) {
	return await database
		.select()
		.from(usersTable)
		.where(eq(usersTable.userId, userId));
}

/**
 * Utility function to make an SQL query through the Drizzle ORM
 * Makes the query to fetch all users from the users table
 */
export async function getUsers() {
	return await database.select().from(usersTable);
}

/**
 * Utility function to make an SQL query through the Drizzle ORM
 * Makes the query to fetch all users matching (partially) a provided username attribute
 */
export async function getUsersByUsername(username: string) {
	return await database
		.select({
			userId: usersTable.userId,
			firstName: usersTable.firstName,
			lastName: usersTable.lastName,
			username: usersTable.username,
			dateOfBirth: usersTable.dateOfBirth,
		})
		.from(usersTable)
		.where(like(usersTable.username, `%${username}%`));
}
