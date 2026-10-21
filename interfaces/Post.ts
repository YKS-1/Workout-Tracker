/**
 * Interface type for a post
 * Includes the similar or same attributes/schema used in the posts table in the database
 * Offers better IDE and type-safe support for the frontend components
 */
export interface Post {
	id: string;
	authorId: string;
	createdAt: string;
	updatedAt: string;
	title: string;
	description: string;
}
