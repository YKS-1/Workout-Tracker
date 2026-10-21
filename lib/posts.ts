import { database } from '@/drizzle';
import { postsTable, usersTable } from '@/drizzle/schema';
import { desc, eq } from 'drizzle-orm';

/**
 * Utility function to make an SQL query through the Drizzle ORM
 * Makes the query to create new entry in the posts table with the provided values
 * @param authorId The UUID of the user who created the post
 * @param title The primary title of the post
 * @param description The (additional) description of the post
 */
export async function createPost(
	authorId: string,
	title: string,
	description: string,
) {
	return await database
		.insert(postsTable)
		.values({
			authorId,
			title,
			description,
		})
		.returning();
}

/**
 * Utility function to make an SQL query through the Drizzle ORM
 * Makes the query to fetch all posts from the posts table
 */
export async function getAllPosts() {
    return await database
        .select({
            id: postsTable.id,
            title: postsTable.title,
            description: postsTable.description,
            createdAt: postsTable.createdAt,
            authorId: postsTable.authorId,
            // These fields come from the usersTable via the join
            username: usersTable.username,
            firstName: usersTable.firstName,
            lastName: usersTable.lastName,
        })
        .from(postsTable)
        .leftJoin(usersTable, eq(postsTable.authorId, usersTable.userId))
        .orderBy(desc(postsTable.createdAt));
}

/**
 * Utility function to make an SQL query through Drizzle ORM
 * Makes the query to fetch an individual post by its unique ID from the posts table
 * @param postId
 */
export async function getPostById(postId: string) {
	return await database
		.select()
		.from(postsTable)
		.where(eq(postsTable.id, postId));
}

/**
 * Utility function to make an SQL query through Drizzle ORM
 * Makes the query to fetch all posts made by a specific user through the unique userId from the posts table
 */
export async function getPostsByUserId(userId: string) {
	return await database
		.select()
		.from(postsTable)
		.where(eq(postsTable.authorId, userId))
		.orderBy(desc(postsTable.createdAt));
}

/**
 * Utility function to make an SQL query through Drizzle ORM
 * Makes the query to update an existing post with the provided attribute values
 * @param postId The unique ID value of the post that will be updated
 * @param content An object consisting of the 'title' and 'description' properties for the post
 */
export async function updatePostById(
	postId: string,
	content: { title?: string; description?: string },
) {
	// Setup the updated object for the PATCH method
	// User can only update the 'title' and 'description' attributes of the created post
	// The 'updatedAt' attribute is changed automatically on each update
	// Use the passed attribute from the 'content' object; if not present use the default value
	const updatedContent = {
		title: content.title || postsTable.title,
		description: content.description || postsTable.description,
	};

	return await database
		.update(postsTable)
		.set({
			...updatedContent,
			updatedAt: new Date(),
		})
		.where(eq(postsTable.id, postId))
		.returning();
}

/**
 * Utility function to make an SQL query through Drizzle ORM
 * Makes the query to delete an existing post with the provided unique post ID
 * @param postId The unique ID value of the post that will be deleted
 */
export async function deletePostById(postId: string) {
	return database
		.delete(postsTable)
		.where(eq(postsTable.id, postId))
		.returning();
}
