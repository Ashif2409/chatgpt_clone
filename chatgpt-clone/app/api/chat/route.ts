import { type NextRequest, NextResponse } from "next/server";
import { CoreMessage, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getTokenizer } from "@/lib/tokenizer"; 
import { trimMessagesToFitTokenLimit } from "@/app/utils/token-limiter";

/**
 * API route for chat operations: list, get, create, send, edit, and delete chats/messages.
 * Supports file attachments and streaming AI responses.
 */

// ========== GET: List chats or get messages for a chat ==========
export async function GET(request: NextRequest) {
  const client = await clientPromise;
  const db = client.db("chatdb");
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const chatId = searchParams.get("chatId");

  if (action === "list") {
    // List all chats
    const chats = await db.collection("chats").find().toArray();
    return NextResponse.json({
      chats: chats.map((chat) => ({
        id: chat._id.toString(),
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      })),
    });
  }

  if (chatId) {
    // Get messages for a specific chat
    const objectId = new ObjectId(chatId);
    const chat = await db.collection("chats").findOne({ _id: objectId });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    const messages = await db
      .collection("messages")
      .find({ chatId: objectId })
      .sort({ timestamp: 1 })
      .toArray();
    return NextResponse.json({
      messages: messages.map((msg) => ({
        id: msg._id.toString(),
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
    });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// ========== POST: Create chat or send message ==========



export async function POST(request: NextRequest) {
  const client = await clientPromise;
  const db = client.db("chatdb");

  try {
    const body = await request.json();
    const { messages: chatMessages, chatId, action, files } = body;

    // Choose your model here.
    const model = "gpt-4o";

    // 1. Tokenizer setup
    // For gpt-4o and gpt-4-turbo use tiktoken's cl100k_base encoding
    const encoder = await getTokenizer();

    if (action === "create") {
      const now = new Date();
      const newChat = {
        title: "Untitled Chat",
        createdAt: now,
        updatedAt: now,
      };
      const result = await db.collection("chats").insertOne(newChat);
      return NextResponse.json({
        chat: { ...newChat, id: result.insertedId.toString() },
      });
    }

    if (!chatMessages || !Array.isArray(chatMessages) || !chatId) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(chatId);
    const chat = await db.collection("chats").findOne({ _id: objectId });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Save last user message
    const lastUserMessage = chatMessages[chatMessages.length - 1];
    if (lastUserMessage?.role === "user") {
      await db.collection("messages").insertOne({
        role: lastUserMessage.role,
        content: lastUserMessage.content,
        chatId: objectId,
        createdAt: new Date(),
      });

      // Update chat title if this is the first message
      const messageCount = await db
        .collection("messages")
        .countDocuments({ chatId: objectId });
      if (messageCount === 1) {
        await db.collection("chats").updateOne(
          { _id: objectId },
          {
            $set: {
              title: lastUserMessage.content.slice(0, 50) + "...",
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    // Prepare messages for AI, including file attachments
    let completeMessages = [...chatMessages];
    if (files && Array.isArray(files)) {
      for (const fileUrl of files) {
        completeMessages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: fileUrl },
            },
          ],
        });
        // Optionally save file upload as a message
        await db.collection("messages").insertOne({
          chatId: objectId,
          role: "user",
          content: `[Image uploaded](${fileUrl})`,
          imageUrl: fileUrl,
          createdAt: new Date(),
        });
      }
    }

    // ===== 2. TOKEN LIMIT MANAGEMENT PER MODEL =====
    completeMessages = trimMessagesToFitTokenLimit(
      completeMessages,
      encoder,
      model,
      1024 
    );
    // ===============================================

    // Stream AI response and save to DB
    const result = await streamText({
      model: openai(model),
      messages: completeMessages,
      onFinish: async ({ text }) => {
        await db.collection("messages").insertOne({
          chatId: objectId,
          role: "assistant",
          content: text,
          createdAt: new Date(),
        });
      },
    });

    return result.toDataStreamResponse();

  } catch (error) {
    return NextResponse.json(
      { error: String(error) || "Server error" },
      { status: 500 }
    );
  }
}


// ========== PUT: Edit a message and regenerate AI response ==========
export async function PUT(request: NextRequest) {
  const client = await clientPromise;
  const db = client.db("chatdb");
  try {
    const { messageId, content, chatId } = await request.json();
    if (!chatId || !messageId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const chatObjectId = new ObjectId(chatId);
    const messageObjectId = new ObjectId(messageId);
    const chat = await db.collection("chats").findOne({ _id: chatObjectId });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    // Update message
    await db.collection("messages").updateOne(
      { _id: messageObjectId, chatId: chatObjectId },
      { $set: { content, timestamp: new Date() } }
    );
    // Update chat title if this is the first message
    const messages = await db
      .collection("messages")
      .find({ chatId: chatObjectId })
      .sort({ timestamp: 1 })
      .toArray();
    const firstMessage = messages.find((m: any) => m.role === "user");
    if (firstMessage && firstMessage._id.equals(messageObjectId)) {
      await db.collection("chats").updateOne(
        { _id: chatObjectId },
        {
          $set: {
            title: content.slice(0, 50) + "...",
            updatedAt: new Date(),
          },
        }
      );
    }
    // Regenerate AI response for edited message
    const editIndex = messages.findIndex((m: any) => m._id.equals(messageObjectId));
    const slicedMessages = messages.slice(0, editIndex + 1);
    const result = await streamText({
      model: openai("gpt-4o"),
      messages: slicedMessages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      maxTokens: 4000,
    });
    // Delete subsequent messages
    await db.collection("messages").deleteMany({
      chatId: chatObjectId,
      timestamp: { $gt: slicedMessages[slicedMessages.length - 1].timestamp },
    });
    // Save new AI response
    const aiResponseText = await result.text;
    await db.collection("messages").insertOne({
      chatId: chatObjectId,
      role: "assistant",
      content: aiResponseText,
      timestamp: new Date(),
    });
    return result.toDataStreamResponse();
  } catch (error) {
    return NextResponse.json({ error: String(error) || "Failed to edit message" }, { status: 500 });
  }
}

// ========== DELETE: Delete a chat and its messages ==========
export async function DELETE(request: NextRequest) {
  const client = await clientPromise;
  const db = client.db("chatdb");
  try {
    const { chatId } = await request.json();
    if (!chatId) {
      return NextResponse.json({ error: "Chat ID required" }, { status: 400 });
    }
    const objectId = new ObjectId(chatId);
    const chat = await db.collection("chats").findOne({ _id: objectId });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    await db.collection("chats").deleteOne({ _id: objectId });
    await db.collection("messages").deleteMany({ chatId: objectId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) || "Failed to delete chat" }, { status: 500 });
  }
}

// ========== PATCH: Edit a chat title ==========
export async function PATCH(request: NextRequest) {
  const client = await clientPromise;
  const db = client.db("chatdb");

  try {
    const { chatId, title } = await request.json();

    if (!chatId || !title || typeof title !== "string") {
      return NextResponse.json({ error: "chatId and title are required." }, { status: 400 });
    }

    const objectId = new ObjectId(chatId);
    const chat = await db.collection("chats").findOne({ _id: objectId });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found." }, { status: 404 });
    }

    const result = await db.collection("chats").updateOne(
      { _id: objectId },
      {
        $set: {
          title: title.trim(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Failed to update chat title." }, { status: 500 });
    }

    const updatedChat = await db.collection("chats").findOne({ _id: objectId });

    if (!updatedChat) {
      return NextResponse.json({ error: "Updated chat not found." }, { status: 404 });
    }

    return NextResponse.json({ chat: { ...updatedChat, id: updatedChat._id.toString() } });
  } catch (error) {
    console.error("PATCH /api/chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}