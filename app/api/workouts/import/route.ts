import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/drizzle';
import {
  workoutProfilesTable,
  profileExercisesTable,
  workoutProfileTagsTable,
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Generates a unique 8 character share code, retrying on the rare chance of a collision
async function generateUniqueShareCode(maxAttempts = 5): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = uuidv4().slice(0, 8).toUpperCase();

    const existing = await database
      .select({ profileId: workoutProfilesTable.profileId })
      .from(workoutProfilesTable)
      .where(eq(workoutProfilesTable.shareCode, code))
      .limit(1);

    if (existing.length === 0) return code;
  }
  throw new Error('Failed to generate a unique share code. Please try again.');
}

// Strips trailing ' (copy)' from a name so copies of copies don't stack the suffix
function stripCopySuffix(name: string): string {
  return name.replace(/ \(copy\)$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // RIGHT NOW: Read from body
    // FUTURE: Change this to request.headers.get('x-user-id')
    const userId = body.userId;
    const { shareCode } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!shareCode?.trim()) {
      return NextResponse.json({ error: 'shareCode is required' }, { status: 400 });
    }

    // Look up the workout by share code
    const normalizedShareCode = shareCode.trim().toUpperCase();

    const [original] = await database
      .select()
      .from(workoutProfilesTable)
      .where(eq(workoutProfilesTable.shareCode, normalizedShareCode))
      .limit(1);

    if (!original) {
      return NextResponse.json({ error: 'No workout found with that share code' }, { status: 404 });
    }

    // Block the owner from importing their own workout
    if (original.ownerId === userId) {
      return NextResponse.json({ error: 'You cannot import your own workout' }, { status: 403 });
    }

    const newShareCode = await generateUniqueShareCode();
    const newName = `${stripCopySuffix(original.name)} (copy)`;

    // Create a new profile for the importing user
    const inserted = await database
      .insert(workoutProfilesTable)
      .values({
        name: newName,
        shareCode: newShareCode,
        ownerId: userId,
      })
      .returning({ profileId: workoutProfilesTable.profileId });

    const newProfileId = inserted[0]?.profileId;
    if (!newProfileId) {
      return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 });
    }

    // Fetch exercises and tags in parallel
    const [originalExercises, originalTags] = await Promise.all([
      database
        .select()
        .from(profileExercisesTable)
        .where(eq(profileExercisesTable.profileId, original.profileId)),
      database
        .select()
        .from(workoutProfileTagsTable)
        .where(eq(workoutProfileTagsTable.profileId, original.profileId)),
    ]);

    // Copy all exercises
    if (originalExercises.length > 0) {
      await database.insert(profileExercisesTable).values(
        originalExercises.map((ex) => ({
          profileId: newProfileId,
          exerciseId: ex.exerciseId,
          weight:   ex.weight   ?? null,
          sets:     ex.sets     ?? null,
          reps:     ex.reps     ?? null,
          duration: ex.duration ?? null,
          distance: ex.distance ?? null,
        }))
      );
    }

    // Copy all tags
    if (originalTags.length > 0) {
      await database
        .insert(workoutProfileTagsTable)
        .values(originalTags.map((t) => ({ profileId: newProfileId, tag: t.tag })))
        .onConflictDoNothing();
    }

    return NextResponse.json(
      {
        message: 'Workout imported successfully',
        profileId: newProfileId,
        name: newName,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to import workout:', error);
    return NextResponse.json({ error: 'Failed to import workout' }, { status: 500 });
  }
}