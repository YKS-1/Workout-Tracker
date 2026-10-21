import { NextResponse, NextRequest } from 'next/server';
import { model } from '@/lib/geminiSetup';
import { database } from '@/drizzle';
import { chatMessagesTable } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // RIGHT NOW: Read from body
    // FUTURE: Change this to request.headers.get('x-user-id')
    const userId = body.userId;
    const skipHistory = body.skipHistory === true;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { prompt } = body;
    //validate prompt, reject empty or whitespace only input
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    let fullPrompt = `user: ${prompt}`;

    // Only fetch history if this is a normal chat conversation
    if (!skipHistory) {
      //Fetch the 20 most recent messages (Newest -> Oldest)
      const recentMessages = await database
        .select({ 
          role: chatMessagesTable.role, 
          content: chatMessagesTable.content 
        })
        .from(chatMessagesTable)
        .where(eq(chatMessagesTable.userId, userId))
        .orderBy(desc(chatMessagesTable.createdAt)) // Get newest first
        .limit(20); // Stop after 20

      //Reverse them so the AI sees them in chronological order (Oldest -> Newest)
      const history = recentMessages.reverse();

      //build conversation history as context for chatbot
      fullPrompt = history
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n') + `\n${fullPrompt}`;
    }

    const result = await model.generateContent(fullPrompt);
    //ensure response is fully resolved
    const aiResponse = result.response;
    const text = aiResponse.text();

    //save the user's message and AI response to the database ONLY if not a summary
    if (!skipHistory) {
      await database.insert(chatMessagesTable).values({ userId, role: 'user', content: prompt });
      await database.insert(chatMessagesTable).values({ userId, role: 'assistant', content: text });
    }

    return NextResponse.json({ response: text });

  } catch (error: any) {
    console.error("AI Error:", error);

    if (error.status === 503 || error.message?.includes('503')) {
      return NextResponse.json(
        { error: "FitHub AI coach is currently busy helping other lifters. Try again in a few seconds!" },
        { status: 503 }
      );
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: "Slow down! Too many requests. Wait a minute before asking again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "AI failed to respond. Check your connection or API key." },
      { status: 500 }
    );
  }
}