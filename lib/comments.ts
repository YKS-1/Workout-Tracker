import { database } from '@/drizzle';
import { postCommentsTable } from '@/drizzle/schema';
import { desc, eq } from 'drizzle-orm';

/**
 * Utility function to make an SQL query through Drizzle ORM
 * Makes the query to create a new post comment in the post_comments table
 */
export async function createComment(
	authorId: string,
	postId: string,
	content: string,
) {
	return await database
		.insert(postCommentsTable)
		.values({
			authorId,
			postId,
			content,
		})
		.returning();
}

/**
 * Utility function to make an SQL query through Drizzle ORM
 * Makes the query to fetch a list of comments for a specific postId attribute
 */
export async function getCommentsByPostId(postId: string) {
	return await database
		.select()
		.from(postCommentsTable)
		.where(eq(postCommentsTable.postId, postId))
		.orderBy(desc(postCommentsTable.createdAt));
}

/**
 * Utility function to make an SQL query through Drizzle ORM
 * Makes the query to individually get a single comment by its unique ID attribute
 */
export async function getCommentById(commentId: string) {
	return await database
		.select()
		.from(postCommentsTable)
		.where(eq(postCommentsTable.id, commentId));
}

/**
 * Utility function to make an SQL query through Drizzle ORM
 * Makes the query to update the comment content
 */
export async function updateCommentContent(commentId: string, content: string) {
	return await database
		.update(postCommentsTable)
		.set({
			content,
			updatedAt: new Date(),
		})
		.where(eq(postCommentsTable.id, commentId))
		.returning();
}

/**
 * Utility function to make an SQL query through Drizzle ORM
 * Makes the query to delete a comment by the provided ID
 */
export async function deleteCommentById(commentId: string) {
	return database
		.delete(postCommentsTable)
		.where(eq(postCommentsTable.id, commentId))
		.returning();
}
