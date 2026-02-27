import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  MediaGalleryBuilder,
  MediaGalleryItem,
  MediaGalleryItemBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  Message,
  CommandInteraction,
} from "discord.js";
import { Discord, SimpleCommand, SimpleCommandMessage, Slash } from "discordx";
import { config } from "../config";

@Discord()
export class HelpCommand {
  async getContainer(
    uni: Message | CommandInteraction,
  ): Promise<ContainerBuilder> {
    const guildName = uni.guild;

    const client = uni.client;

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

    const container = new ContainerBuilder()
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`• **Callisto Help Menu**`),
            new TextDisplayBuilder().setContent(
              `> My prefix in **${guildName ?? "this server"}** is \`${config.prefix}\``,
            ),
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(client.user!.displayAvatarURL()),
          ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `• **Categories**\n\n` + categories.map((c) => `> ${c}`).join("\n"),
        ),
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `• **Links**\n\n` +
            `> Invite Me: https://example.com\n` +
            `> Support Server: https://example.com\n\n` +
            `*Callisto ${config.version}*`,
        ),
      );

    return container;
  }

  @SimpleCommand({ name: "help", description: "Display help information" })
  async simpleExecute(command: SimpleCommandMessage) {
    const container = await this.getContainer(command.message);

    await command.message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  @Slash({ description: "Help Command", name: "help" })
  async slashExecute(command: CommandInteraction) {
    command.reply({
      components: [await this.getContainer(command)],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}
