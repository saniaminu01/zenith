import { Agent, CommandRouter, getTestUrl } from "@xmtp/agent-sdk";
import { existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

if (existsSync(".env")) {
  process.loadEnvFile?.(".env");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const router = new CommandRouter({ helpCommand: "/help" });

router
  .command("/gm", "Say gm back", async (ctx) => {
    await ctx.sendTextReply("gm ☀️ — I'm Zenith, welcome to the XMTP network.");
  })
  .command("/echo", "Echo back whatever you type after it", async (ctx) => {
    const text = ctx.isText() ? ctx.message.content : "";
    const echoed = text.replace(/^\/echo\s*/i, "").trim();
    await ctx.sendTextReply(echoed.length > 0 ? echoed : "Say something after /echo!");
  })
  .command("/whoami", "Show your inbox ID and address", async (ctx) => {
    const address = await ctx.getSenderAddress();
    await ctx.sendTextReply(
      `Inbox ID: ${ctx.message.senderInboxId}\nAddress: ${address ?? "unknown"}`,
    );
  })
  .command("/ping", "Health check", async (ctx) => {
    await ctx.sendTextReply("pong 🏓");
  })
  .default(async (ctx) => {
    const text = ctx.isText() ? ctx.message.content : "";

    if (!text.trim()) {
      await ctx.sendTextReply(
        "👋 I'm Zenith. Try /help to see my commands, or just say something!",
      );
      return;
    }

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 300,
        system:
          "You are Zenith, a friendly, upbeat chat agent living on the XMTP decentralized messaging network. Keep replies short (1-3 sentences), warm, and conversational — this is a chat interface, not an essay.",
        messages: [{ role: "user", content: text }],
      });

      const reply = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      await ctx.sendTextReply(reply || "Hmm, I'm not sure what to say to that!");
    } catch (error) {
      console.error("Claude API error:", error);
      await ctx.sendTextReply(
        "👋 I'm Zenith. Try /help to see my commands, or just say something!",
      );
    }
  });

async function main() {
  const customDbPath = (inboxId: string) =>
    `${process.env.RAILWAY_VOLUME_MOUNT_PATH ?? "."}/${process.env.XMTP_ENV}-${inboxId.slice(0, 8)}.db3`;

  const agent = await Agent.createFromEnv({
    dbPath: customDbPath,
  });

  agent.use(router.middleware());

  agent.on("start", () => {
    console.log(`✅ Zenith is running`);
    console.log(`📬 Address: ${agent.address}`);
    console.log(`🔗 Test it: ${getTestUrl(agent.client)}`);
  });

  agent.on("unhandledError", (error) => {
    console.error("Unhandled agent error:", error);
  });

  await agent.start();
}

main().catch((error) => {
  console.error("Fatal error starting agent:", error);
  process.exit(1);
});
