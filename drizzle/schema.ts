import {
	pgTable,
	timestamp,
	uuid,
	varchar,
	real,
	date,
	text,
	pgEnum,
	uniqueIndex,
	index,
	integer,
	boolean,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['user', 'assistant']);

export const exerciseTypeEnum = pgEnum('exercise_type', ['cardio', 'weights', 'rest']);

export const muscleGroupEnum = pgEnum('muscle_group', [
	'chest',
	'legs',
	'shoulders',
	'back',
	'arms',
	'core',
]);

export const unitEnum = pgEnum('unit', ['Adjustable', 'Variable']);

export const dayOfWeekEnum = pgEnum('day_of_week', [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday',
]);

export const completionModeEnum = pgEnum('completion_mode', [
	'standard',
	'minimum',
	'alternate',
]);

export const workoutScheduleOverrideTypeEnum = pgEnum('workout_schedule_override_type', [
  'manual_add',
  'skip',
]);

// Friendship status enum options
export const friendshipStatusEnum = pgEnum('friendship_status', [
	'pending',
	'accepted',
	'rejected',
]);

export const tagEnum = pgEnum('tag', [
  'casual', 'moderate', 'intense',
  'chest', 'legs', 'shoulders', 'back', 'arms', 'core', 'cardio'
]);


// Table: users
// Stores all registered users of the application
export const usersTable = pgTable('users', {
	userId: uuid('user_id').defaultRandom().primaryKey(),
	firstName: varchar('first_name', { length: 50 }).notNull(),
	lastName: varchar('last_name', { length: 50 }).notNull(),
	username: varchar('username', { length: 50 }).notNull().unique(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	dateOfBirth: date('date_of_birth').notNull(),
	height: real('height').notNull(),
	heightUnit: varchar('height_unit', { length: 10 }).notNull(), // "cm" or "ft"
	weight: real('weight').notNull(),
	weightUnit: varchar('weight_unit', { length: 10 }).notNull(), // "kg" or "lbs"
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table: posts
// The primary database table for posts; includes 'title' and 'description' as part of the posts
// With additional meta fields such as 'createdAt' and 'updatedAt'
export const postsTable = pgTable('posts', {
	id: uuid('id').defaultRandom().primaryKey(),
	title: varchar('title', { length: 100 }).notNull(),
	description: varchar('description', { length: 500 }).notNull(),
	authorId: uuid('author_id')
		.notNull()
		.references(() => usersTable.userId, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

// Table: exercises
// Stores all available exercises (cardio and weights)
export const exercisesTable = pgTable('exercises', {
	exerciseId: uuid('exercise_id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	type: exerciseTypeEnum('type').notNull(),
	caloriesBurnedPerMin: real('calories_burned_per_min').notNull(),
	unit: unitEnum('unit'),
	muscleGroup: muscleGroupEnum('muscle_group'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table: workout_profiles
// Stores workout templates created by users
export const workoutProfilesTable = pgTable('workout_profiles', {
  profileId: uuid('profile_id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  shareCode: varchar('share_code', { length: 50 }).notNull().unique(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
},
(table) => ({
  ownerIdIndex: index('workout_profiles_owner_id_idx').on(table.ownerId),
}));

// Table: scheduled_days
// Stores the scheduled days for each workout profile
export const scheduledDaysTable = pgTable('scheduled_days', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => workoutProfilesTable.profileId, { onDelete: 'cascade' }),
  dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
(table) => ({
  uniqueProfileDay: uniqueIndex('unique_profile_day').on(table.profileId, table.dayOfWeek),
}));

// Table: workout_schedule_overrides
// Stores one-off calendar date adds and skips for workout profiles
export const workoutScheduleOverridesTable = pgTable('workout_schedule_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => workoutProfilesTable.profileId, { onDelete: 'cascade' }),
  scheduledFor: date('scheduled_for').notNull(),
  overrideType: workoutScheduleOverrideTypeEnum('override_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
(table) => ({
  uniqueScheduleOverridePerDay: uniqueIndex('unique_schedule_override_per_day').on(
    table.userId,
    table.profileId,
    table.scheduledFor,
  ),
  scheduleOverrideUserDateIndex: index('workout_schedule_overrides_user_date_idx').on(
    table.userId,
    table.scheduledFor,
  ),
}));

// Table: workout_completions
// Stores each time a user completes a workout on a given date
export const workoutCompletionsTable = pgTable('workout_completions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => workoutProfilesTable.profileId, { onDelete: 'cascade' }),
  completedOn: date('completed_on').notNull(),
  completionMode: completionModeEnum('completion_mode').default('standard').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
(table) => ({
  uniqueCompletionPerDay: uniqueIndex('unique_completion_per_day').on(
    table.userId,
    table.profileId,
    table.completedOn,
  ),
  userCompletionDateIndex: index('workout_completions_user_date_idx').on(
    table.userId,
    table.completedOn,
  ),
}));

// Table: user_goal_settings
// Stores per-user weekly goals, reminder time, and recovery mode preferences
export const userGoalSettingsTable = pgTable('user_goal_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),
  weeklyWorkoutGoal: integer('weekly_workout_goal').default(3).notNull(),
  reminderTime: varchar('reminder_time', { length: 5 }).default('18:00').notNull(),
  recoveryModeEnabled: boolean('recovery_mode_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Table: profile_exercises
// Connects exercises to workout profiles
export const profileExercisesTable = pgTable('profile_exercises', {
	id: uuid('id').defaultRandom().primaryKey(),
	profileId: uuid('profile_id')
		.notNull()
		.references(() => workoutProfilesTable.profileId, { onDelete: 'cascade' }),
	exerciseId: uuid('exercise_id')
		.notNull()
		.references(() => exercisesTable.exerciseId, { onDelete: 'cascade' }),
	// Weights fields
	weight: real('weight'),
	sets: integer('sets'),
	reps: integer('reps'),
	// Cardio/rest fields
	duration: integer('duration'),
	distance: real('distance'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Table: workout_logs
// Stores one logged workout session per user, routine, and date
export const workoutLogsTable = pgTable('workout_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => workoutProfilesTable.profileId, { onDelete: 'cascade' }),
  performedOn: date('performed_on').notNull(),
  completionMode: completionModeEnum('completion_mode').default('standard').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
},
(table) => ({
  uniqueWorkoutLogPerDay: uniqueIndex('unique_workout_log_per_day').on(
    table.userId,
    table.profileId,
    table.performedOn,
  ),
  workoutLogsUserDateIndex: index('workout_logs_user_date_idx').on(
    table.userId,
    table.performedOn,
  ),
  workoutLogsProfileDateIndex: index('workout_logs_profile_date_idx').on(
    table.profileId,
    table.performedOn,
  ),
}));

// Table: workout_log_exercises
// Stores the actual performed exercise values for a logged workout session
export const workoutLogExercisesTable = pgTable('workout_log_exercises', {
  id: uuid('id').defaultRandom().primaryKey(),
  workoutLogId: uuid('workout_log_id')
    .notNull()
    .references(() => workoutLogsTable.id, { onDelete: 'cascade' }),
  profileExerciseId: uuid('profile_exercise_id').references(() => profileExercisesTable.id, {
    onDelete: 'set null',
  }),
  exerciseId: uuid('exercise_id').references(() => exercisesTable.exerciseId, {
    onDelete: 'set null',
  }),
  name: varchar('name', { length: 100 }).notNull(),
  type: exerciseTypeEnum('type').notNull(),
  caloriesBurnedPerMin: real('calories_burned_per_min').notNull(),
  muscleGroup: muscleGroupEnum('muscle_group'),
  unit: unitEnum('unit'),
  sortOrder: integer('sort_order').default(0).notNull(),
  weight: real('weight'),
  sets: integer('sets'),
  reps: integer('reps'),
  duration: integer('duration'),
  distance: real('distance'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
},
(table) => ({
  workoutLogExercisesLogOrderIndex: index('workout_log_exercises_log_order_idx').on(
    table.workoutLogId,
    table.sortOrder,
  ),
}));

// Table: chat_messages
// Stores all AI chat messages per user for persistent history
export const chatMessagesTable = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, // <-- close the columns object here
(table) => ({
  userIdIndex: index('chat_messages_user_id_idx').on(table.userId),
}));

// Table: post_likes
// Table for storing the likes for all posts and its corresponding user likes
// References both the `postsTable` and the `usersTable` tables previously defined.
export const postLikesTable = pgTable(
	'post_likes',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => usersTable.userId, { onDelete: 'cascade' }),
		postId: uuid('post_id')
			.notNull()
			.references(() => postsTable.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
	},
	(table) => ({
		uniqueLike: uniqueIndex('unique_user_post_like').on(
			table.userId,
			table.postId,
		),
		userIndex: index('post_likes_user_index').on(table.userId),
		postIndex: index('post_likes_post_index').on(table.postId),
	}),
);

// Table: post_comments
// Table for storing the comments for posts by the corresponding user
// References the 'postsTable' and the 'usersTable' tables previously defined
export const postCommentsTable = pgTable('post_comments', {
	id: uuid('id').defaultRandom().primaryKey(),
	authorId: uuid('author_id')
		.notNull()
		.references(() => usersTable.userId, { onDelete: 'cascade' }),
	postId: uuid('post_id')
		.notNull()
		.references(() => postsTable.id, { onDelete: 'cascade' }),
	content: varchar('content', { length: 255 }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

// Table: friendships
// A database table for storing many-to-many friendship relationships between two users
// A friendship relation can be of one status: 'pending' or 'accepted' or 'rejected'
// Friendship is one way connection, unlike following/follower manner
export const friendshipsTable = pgTable(
	'friendships',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		// The user who has sent the friend request
		requesterId: uuid('requester_id')
			.notNull()
			.references(() => usersTable.userId, { onDelete: 'cascade' }),
		// The user who will receive the friend request
		receiverId: uuid('receiver_id')
			.notNull()
			.references(() => usersTable.userId, { onDelete: 'cascade' }),
		status: friendshipStatusEnum('status').default('pending').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	// Ensures friendships are unique - no duplicate friend requests
	(table) => ({
		uniqueFriendship: uniqueIndex('unique_friendship').on(
			table.requesterId,
			table.receiverId,
		),
	}),
);
// Table: workout_profile_tags
// Stores tags for each workout profile (multiple tags per profile)
export const workoutProfileTagsTable = pgTable('workout_profile_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => workoutProfilesTable.profileId),
  tag: tagEnum('tag').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
