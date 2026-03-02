import {
  GuildMember,
  PermissionsBitField,
  CommandInteraction,
  ApplicationCommandOptionType,
} from "discord.js";
import {
  Discord,
  SimpleCommand,
  Slash,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandOptionType,
  SlashOption,
} from "discordx";

enum BanResult {
  MISSING_PERMISSION,
  ALREADY_BANNED,
  CANNOT_BAN,
  SUCCESS,
  ERROR,
}

@Discord()
export class Ban {
  async banMember(
    attacker: GuildMember,
    victim: GuildMember,
    reason: string,
    deletePreviousMessages: number,
  ): Promise<BanResult> {
    if (attacker.id === victim.id) {
      return BanResult.CANNOT_BAN;
    }

    if (attacker.roles.highest.comparePositionTo(victim.roles.highest) <= 0) {
      return BanResult.CANNOT_BAN;
    }

    if (!victim.bannable) {
      return BanResult.CANNOT_BAN;
    }

    const existing = await victim.guild.bans.fetch(victim.id).catch(() => null);
    if (existing) return BanResult.ALREADY_BANNED;

    try {
      await victim.ban({
        reason: reason,
        deleteMessageSeconds: deletePreviousMessages,
      });
      return BanResult.SUCCESS;
    } catch {
      return BanResult.ERROR;
    }
  }

  private calculateToSeconds(
    value: number,
    unit: "s" | "m" | "h" | "d",
  ): number {
    const multipliers = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * multipliers[unit];
  }

  private getMessage(result: BanResult, username: string): string {
    switch (result) {
      case BanResult.MISSING_PERMISSION:
        return ":x: You do not have the `BAN_MEMBERS` permission!";
      case BanResult.ALREADY_BANNED:
        return ":warning: User is already banned!";
      case BanResult.CANNOT_BAN:
        return ":x: Unable to ban this user!";
      case BanResult.ERROR:
        return ":x: An error occurred while banning.";
      case BanResult.SUCCESS:
        return `✅ Successfully banned '${username}'!`;
    }
  }

  private parseDuration(
    input?: string,
  ): { seconds: number } | { error: string } {
    if (!input) return { seconds: 0 };

    const match = input
      .trim()
      .toLowerCase()
      .match(/^(\d+)([smhd])$/);

    if (!match) {
      return { error: "Invalid duration format. Use 7d, 3h, 10m, 5s" };
    }

    const value = Number(match[1]);
    const unit = match[2] as "s" | "m" | "h" | "d";

    if (value < 1) {
      return { error: "Values must be greater than 0." };
    }

    if (unit === "d" && value > 7) {
      return { error: "Can't delete messages older than 7 days." };
    }

    return { seconds: this.calculateToSeconds(value, unit) };
  }

  @SimpleCommand({ name: "ban", description: "Ban a member." })
  async banSC(
    @SimpleCommandOption({ name: "User", type: SimpleCommandOptionType.User })
    user: GuildMember,

    @SimpleCommandOption({
      name: "reason",
      description: "reason for the ban.",
      type: SimpleCommandOptionType.String,
    })
    reason: string | undefined,

    @SimpleCommandOption({
      name: "delete_messages",
      description: "Delete Message History, ie: 7d, 3h, 10m, 5s",
      type: SimpleCommandOptionType.String,
    })
    messages: string | undefined,
    command: SimpleCommandMessage,
  ) {
    if (!user) {
      await command.sendUsageSyntax();
      return;
    }

    const attacker = command.message.member!;

    if (!attacker.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return command.message.reply(
        this.getMessage(BanResult.MISSING_PERMISSION, user.user.username),
      );
    }

    const finalReason = reason ?? "No reason provided.";

    const parsed = this.parseDuration(messages);

    if ("error" in parsed) {
      return command.message.reply(`:x: ${parsed.error}`);
    }

    const seconds = parsed.seconds;

    const result = await this.banMember(attacker, user, finalReason, seconds);

    await command.message.reply(this.getMessage(result, user.user.username));
  }

  @Slash({
    name: "ban",
    description: "Ban a member.",
    defaultMemberPermissions: PermissionsBitField.Flags.BanMembers,
  })
  async banSL(
    @SlashOption({
      name: "user",
      description: "User to ban",
      required: true,
      type: ApplicationCommandOptionType.User,
    })
    user: GuildMember,

    @SlashOption({
      name: "reason",
      description: "Reason for ban",
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    reason: string | undefined,

    @SlashOption({
      name: "message_delete_duration",
      description:
        "Duration of messages to delete, must be within last 7 days. Use format: 7d, 3m, 4s, etc.",
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    messages: string | undefined,

    interaction: CommandInteraction,
  ) {
    if (!interaction.inGuild()) return;

    const finalReason = reason ?? "No reason provided.";

    const parsed = this.parseDuration(messages);

    if ("error" in parsed) {
      return interaction.reply(`:x: ${parsed.error}`);
    }

    const seconds = parsed.seconds;

    const result = await this.banMember(
      interaction.member as GuildMember,
      user,
      finalReason,
      seconds,
    );

    await interaction.reply(this.getMessage(result, user.user.username));
  }
}
