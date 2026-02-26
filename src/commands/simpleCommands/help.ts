import { EmbedBuilder, Colors } from "discord.js";
import { Discord, SimpleCommand, SimpleCommandMessage } from "discordx";
import { config } from "../../config";

@Discord()
export class HelpCommand {
  @SimpleCommand({ name: "help", description: "Display help information" })
  async execute(command: SimpleCommandMessage) {
    const client = command.message.client;

    const avatar = client.user?.displayAvatarURL({
      size: 1024,
      forceStatic: false,
    });

    const categories = [
      "🛡️ Security",
      "🔧 Automod",
      "⚔️ Moderation",
      "🛠️ Utility",
      "📦 Others",
      "🎵 Music",
      "🎉 Fun",
      "🎫 Ticket",
      "📊 Rank",
    ];

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setAuthor({ name: "• Callisto Help Menu" })
      .setThumbnail(avatar ?? undefined)
      .setDescription(
        `> My prefix for this server is \`${config.prefix}\`\n` +
          `> I have \`${config.commands}\` commands`,
      )
      .addFields({
        name: "",
        value: "\b",
        inline: false,
      })

      .addFields({
        name: "• Categories:",
        value: [
          "🛡️ Security",
          "🔧 Automod",
          "⚔️ Moderation",
          "🛠️ Utility",
          "🎵 Music",
          "🎉 Fun",
        ]
          .map((c) => `> ${c}`)
          .join("\n"),
        inline: false,
      })
      .addFields({
        name: "• Links:",
        value:
          "> [Invite Me](https://example.com) | [Support Server](https://example.com)",
        inline: false,
      })
      .setFooter({
        text: `Callisto ${config.version}`,
        iconURL: avatar ?? undefined,
      });

    await command.message.reply({ embeds: [embed] });
  }
}
