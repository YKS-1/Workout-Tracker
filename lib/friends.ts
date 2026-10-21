import { database } from '@/drizzle';
import { friendshipsTable, usersTable } from '@/drizzle/schema';
import { and, eq, or } from 'drizzle-orm';

/**
 * Creates a new friendship table row with the provided requesterId and receiverUsername attributes
 * Auto-fills with default values for the other attributes on the row
 */
export async function createFriendship(
	requesterId: string,
	receiverId: string,
) {
	return await database
		.insert(friendshipsTable)
		.values({
			requesterId,
			receiverId,
		})
		.returning();
}

/**
 * Get a list of friend requests for a specific user
 * Includes most relevant information for each request - who sent the request, time, ID, etc
 * Joins with the users table for user info
 */
export async function getFriendRequestsForUserId(userId: string) {
	return await database
		.select({
			id: friendshipsTable.id,
			requesterId: friendshipsTable.requesterId,
			username: usersTable.username,
			firstName: usersTable.firstName,
			lastName: usersTable.lastName,
			sentAt: friendshipsTable.createdAt,
		})
		.from(friendshipsTable)
		.innerJoin(usersTable, eq(friendshipsTable.requesterId, usersTable.userId))
		.where(
			and(
				eq(friendshipsTable.receiverId, userId),
				eq(friendshipsTable.status, 'pending'),
			),
		);
}

/**
 * Query that allows a user to accept a friend request from an already existing request sent to them
 * Simply updates the status option of the request to 'accepted' from 'pending'
 */
export async function acceptAsFriend(requestId: string) {
	return await database
		.update(friendshipsTable)
		.set({ status: 'accepted' })
		.where(eq(friendshipsTable.id, requestId))
		.returning();
}

/**
 * Query that allows a user to reject an incoming friend request sent to them
 * Simply updates the status option of the request to 'rejected' from 'pending'
 */
export async function rejectFriendRequest(requestId: string) {
	return await database
		.update(friendshipsTable)
		.set({ status: 'rejected' })
		.where(eq(friendshipsTable.id, requestId))
		.returning();
}

/**
 * Query that checks whether a friend request exists
 * It can be of any status - accepted, pending or rejected
 */
export async function doesFriendRequestExist(friendRequestId: string) {
	return await database
		.select()
		.from(friendshipsTable)
		.where(eq(friendshipsTable.id, friendRequestId));
}

/**
 * Query the checks whether a friend request's receiver matches the provided receiverId
 * This is to ensure the right user can update the status of their friend request
 */
export async function doesFriendRequestMatchReceiver(receiverId: string) {
	return await database
		.select()
		.from(friendshipsTable)
		.where(eq(friendshipsTable.receiverId, receiverId));
}

/**
 * Query that checks whether a specific friend request is already resolved
 * That is if a friend request is already either accepted or rejected
 */
export async function isFriendRequestResolved(requestId: string) {
	return await database
		.select()
		.from(friendshipsTable)
		.where(
			and(
				eq(friendshipsTable.id, requestId),
				or(
					eq(friendshipsTable.status, 'accepted'),
					eq(friendshipsTable.status, 'rejected'),
				),
			),
		);
}

/**
 * Query that fetches a list of accepted friends for a specific user
 * Query selects a bunch of safe fields from the users and friendships tables using inner join
 */
export async function getFriendsForUserId(userId: string) {
	return await database
		.select({
			userId: usersTable?.userId,
			firstName: usersTable?.firstName,
			lastName: usersTable?.lastName,
			username: usersTable?.username,
			status: friendshipsTable?.status,
		})
		.from(usersTable)
		.innerJoin(
			friendshipsTable,
			or(
				and(
					eq(friendshipsTable.requesterId, usersTable.userId),
					eq(friendshipsTable.receiverId, userId),
				),
				and(
					eq(friendshipsTable.receiverId, usersTable.userId),
					eq(friendshipsTable.requesterId, userId),
				),
			),
		)
		.where(eq(friendshipsTable.status, 'accepted'));
}

/**
 * Query that selects a list of users who are friends
 * Checks whether the two given userIds are friends with each other or not
 */
export async function areUsersFriends(
	firstUserId: string,
	secondUserId: string,
) {
	return await database
		.select()
		.from(friendshipsTable)
		.where(
			and(
				or(
					and(
						eq(friendshipsTable.requesterId, firstUserId),
						eq(friendshipsTable.receiverId, secondUserId),
					),
					and(
						eq(friendshipsTable.requesterId, secondUserId),
						eq(friendshipsTable.receiverId, firstUserId),
					),
				),
				eq(friendshipsTable.status, 'accepted'),
			),
		);
}

/**
 * Deletes a friendship relationship between two users
 * Makes the query to completely delete the entire row in the friendships table
 */
export async function removeFriend(userId: string, friendId: string) {
	return await database
		.delete(friendshipsTable)
		.where(
			or(
				and(
					eq(friendshipsTable.requesterId, userId),
					eq(friendshipsTable.receiverId, friendId),
				),
				and(
					eq(friendshipsTable.requesterId, friendId),
					eq(friendshipsTable.receiverId, userId),
				),
			),
		)
		.returning();
}

/**
 * Utility helper function to get the friendship status between two users
 */
export async function getFriendshipStatus(userId: string, friendId: string) {
	return await database
		.select()
		.from(friendshipsTable)
		.where(
			or(
				and(
					eq(friendshipsTable.receiverId, userId),
					eq(friendshipsTable.requesterId, friendId),
				),
				and(
					eq(friendshipsTable.requesterId, userId),
					eq(friendshipsTable.receiverId, friendId),
				),
			),
		);
}
