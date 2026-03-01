import {
  ActionRowBuilder,
  CommandInteraction,
  ContainerBuilder,
  Message,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";
import {
  Discord,
  MetadataStorage,
  type DSimpleCommand,
  type SimpleCommandMessage,
  SelectMenuComponent,
  SimpleCommand,
  Slash,
} from "discordx";
import { config } from "../../utils/config";

type HelpContext = Message | CommandInteraction;

type HelpPage = {
  category: string;
  commands: string[];
};

type HelpSession = {
  ownerId: string;
  pages: HelpPage[];
  updatedAt: number;
};

const HELP_SELECT_ID = "help_category";
const HELP_OVERVIEW_VALUE = "__overview__";
const SESSION_TTL_MS = 1000 * 60;
const MAX_SELECT_OPTIONS = 25;

@Discord()
export class HelpCommand {
  private readonly sessions = new Map<string, HelpSession>();

  @SimpleCommand({ name: "help", description: "Display help information" })
  async simpleExecute(command: SimpleCommandMessage) {
    const pages = this.getPages();
    const avatar =
      command.message.client.user?.displayAvatarURL() ??
      "https://cdn.discordapp.com/embed/avatars/0.png";

    const msg = await this.respond(
      command.message,
      this.renderOverview(pages, avatar),
    );

    this.sessions.set(msg.id, {
      ownerId: command.message.author.id,
      pages,
      updatedAt: Date.now(),
    });

    this.pruneSessions();
  }

  @Slash({ name: "help", description: "Display help information" })
  async slashExecute(interaction: CommandInteraction) {
    const pages = this.getPages();
    const avatar =
      interaction.client.user?.displayAvatarURL() ??
      "https://cdn.discordapp.com/embed/avatars/0.png";

    const msg = await this.respond(
      interaction,
      this.renderOverview(pages, avatar),
    );

    this.sessions.set(msg.id, {
      ownerId: interaction.user.id,
      pages,
      updatedAt: Date.now(),
    });

    this.pruneSessions();
  }

  @SelectMenuComponent({ id: HELP_SELECT_ID })
  async onSelect(interaction: StringSelectMenuInteraction) {
    const session = this.sessions.get(interaction.message.id);

    if (!session) {
      return interaction.reply({
        content: "Help session expired. Run help again.",
        ephemeral: true,
      });
    }

    if (interaction.user.id !== session.ownerId) {
      return interaction.reply({
        content: "Only the requester can use this menu.",
        ephemeral: true,
      });
    }

    const avatar =
      interaction.client.user?.displayAvatarURL() ??
      "https://cdn.discordapp.com/embed/avatars/0.png";

    const selected = interaction.values[0];

    session.updatedAt = Date.now();

    if (selected === HELP_OVERVIEW_VALUE) {
      return interaction.update(this.renderOverview(session.pages, avatar));
    }

    const page = session.pages.find((p) => p.category === selected);
    if (!page) return;

    return interaction.update(this.renderCategory(page, session.pages, avatar));
  }

  private getPages(): HelpPage[] {
    const grouped = new Map<string, string[]>();

    for (const cmd of MetadataStorage.instance.simpleCommands) {
      const category = this.resolveCategory(cmd);
      const list = grouped.get(category) ?? [];
      list.push(cmd.name);
      grouped.set(category, list);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, commands]) => ({
        category,
        commands: commands.sort(),
      }));
  }

  private resolveCategory(command: DSimpleCommand): string {
    const className = command.discord?.name ?? "General";
    return className.replace(/(Commands|Command)$/, "") || "General";
  }

  private renderOverview(pages: HelpPage[], avatar: string) {
    const summary = pages
      .slice(0, MAX_SELECT_OPTIONS - 1)
      .map((p) => `• \`${p.category}\` (${p.commands.length})`)
      .join("\n");

    const container = new ContainerBuilder()
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# ✦ Callisto Help Center"),
            new TextDisplayBuilder().setContent(`Prefix: \`${config.prefix}\``),
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar)),
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## 📚 Categories"),
        new TextDisplayBuilder().setContent(summary || "No commands found."),
      );

    return {
      components: [container, this.buildMenu(pages, HELP_OVERVIEW_VALUE)],
    };
  }

  private renderCategory(page: HelpPage, pages: HelpPage[], avatar: string) {
    const commandList = page.commands
      .map((c) => `• \`${config.prefix}${c}\``)
      .join("\n");

    const container = new ContainerBuilder()
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# ✦ Callisto Help Center"),
            new TextDisplayBuilder().setContent(`Prefix: \`${config.prefix}\``),
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar)),
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 📁 ${page.category}`),
        new TextDisplayBuilder().setContent(commandList || "No commands."),
      );

    return {
      components: [container, this.buildMenu(pages, page.category)],
    };
  }

  private buildMenu(
    pages: HelpPage[],
    selected: string,
  ): ActionRowBuilder<StringSelectMenuBuilder> {
    const options = [
      new StringSelectMenuOptionBuilder()
        .setLabel("Overview")
        .setValue(HELP_OVERVIEW_VALUE)
        .setDefault(selected === HELP_OVERVIEW_VALUE),
      ...pages.slice(0, MAX_SELECT_OPTIONS - 1).map((p) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(p.category)
          .setValue(p.category)
          .setDefault(selected === p.category),
      ),
    ];

    const menu = new StringSelectMenuBuilder()
      .setCustomId(HELP_SELECT_ID)
      .setPlaceholder("Select a category")
      .addOptions(options);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  }

  private async respond(ctx: HelpContext, payload: any): Promise<Message> {
    if (ctx instanceof Message) {
      return ctx.reply({
        components: payload.components,
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (ctx.deferred || ctx.replied) {
      return (await ctx.editReply({
        components: payload.components,
      })) as Message;
    }

    await ctx.reply({
      components: payload.components,
      flags: MessageFlags.IsComponentsV2,
    });

    return (await ctx.fetchReply()) as Message;
  }

  private pruneSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }
}
