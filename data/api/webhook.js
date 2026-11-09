
import keywords from "../data/keywords.json" with { type: "json" };

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId, text, extra = {}) {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...extra
    })
  });

  if (!response.ok) {
    throw new Error("Telegram API request failed");
  }

  return response.json();
}

// Custom keyboard
const keyboard = {
  keyboard: [
    [{ text: "🍎 Apple" }, { text: "🎬 Movie" }],
    [{ text: "💻 Tech" }, { text: "🎮 Games" }],
    [{ text: "📰 News" }, { text: "/help" }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

// Welcome message
async function startCommand(chatId) {
  const message = `
👋 Welcome to Keyword Bot!

Bot successfully started.

🔍 Search any available keyword.

Commands:

/start - Start bot
/help - Show help
/menu - Open keyboard
/search apple - Search keyword

Select a button below to explore.
`;

  await sendMessage(chatId, message, {
    reply_markup: keyboard
  });
}

// Help command
async function helpCommand(chatId) {
  await sendMessage(
    chatId,
    `📚 Available Commands

/start - Start bot
/help - Help menu
/menu - Show keyboard
/search <keyword> - Search data

Example:
/search apple

You can also type a keyword directly.`
  );
}

// Search keyword
async function searchKeyword(chatId, keyword) {
  const key = keyword.toLowerCase().trim();

  const data = keywords[key];

  if (!data) {
    await sendMessage(
      chatId,
      `❌ Keyword "${keyword}" not found.\n\nTry /menu to see available keywords.`
    );
    return;
  }

  const result = `
${data.title}

📂 Category: ${data.category}

📝 Description:
${data.description}
`;

  await sendMessage(chatId, result);
}

// Main webhook handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  // Verify Telegram webhook secret
  if (
    WEBHOOK_SECRET &&
    req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET
  ) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized"
    });
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({
      ok: false,
      error: "Bot token not configured"
    });
  }

  try {
    const update = req.body;
    const message = update?.message;

    if (!message?.chat?.id || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // Commands
    const [command, ...args] = text.split(/\s+/);
    const argument = args.join(" ");

    if (command === "/start" || command.startsWith("/start@")) {
      await startCommand(chatId);
    }

    else if (command === "/help" || command.startsWith("/help@")) {
      await helpCommand(chatId);
    }

    else if (command === "/menu" || command.startsWith("/menu@")) {
      await sendMessage(chatId, "👇 Select a keyword:", {
        reply_markup: keyboard
      });
    }

    else if (
      command === "/search" ||
      command.startsWith("/search@")
    ) {
      if (!argument) {
        await sendMessage(
          chatId,
          "Usage: /search apple"
        );
      } else {
        await searchKeyword(chatId, argument);
      }
    }

    // Direct keyword search
    else if (!text.startsWith("/")) {
      await searchKeyword(chatId, text);
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("Webhook error:", error);

    return res.status(200).json({
      ok: true,
      message: "Update received"
    });
  }
}
