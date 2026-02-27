import {
  IntentsBitField,
  Events,
  ActivityType,
  Message,
  type Interaction,
} from "discord.js";
import { Client, MetadataStorage } from "discordx";
import { config } from "./config";
import { importx, dirname } from "@discordx/importer";
import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config({
  quiet: true,
});

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.MessageContent,
  ],
  presence: {
    activities: [
      {
        name: "",
        state: "🌙  Callisto " + config.version + " | .help",
        type: ActivityType.Custom,
      },
    ],
  },
  simpleCommand: {
    prefix: config.prefix || ".",
    argSplitter: " ",
  },
});

async function start() {
  await importx(`${dirname(import.meta.url)}/{commands,events}/*.{ts,js}`);

  if (!process.env.BOT_TOKEN) {
    console.error("BOT_TOKEN missing");
    return;
  }

  await client.login(process.env.BOT_TOKEN);
}

client.on(Events.ClientReady, async () => {
  console.log(chalk.green("Started Bot!"));

  await client.initApplicationCommands();

  MetadataStorage.instance.simpleCommands.forEach((cmd) => {
    console.log(chalk.green(`✓ Loaded ${cmd.name} command!`));
  });
});

client.on(Events.MessageCreate, (message: Message) => {
  void client.executeCommand(message);
});

client.on(Events.InteractionCreate, (interaction: Interaction) => {
  client.executeInteraction(interaction);
});

start();

process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await client.destroy();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await client.destroy();
  process.exit(0);
});

export default client;
