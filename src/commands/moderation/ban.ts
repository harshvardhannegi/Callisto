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
      await victim.ban({ reason });
      return BanResult.SUCCESS;
    } catch {
      return BanResult.ERROR;
    }
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

  @SimpleCommand({ name: "ban", description: "Ban a member." })
  async banSC(
    @SimpleCommandOption({ name: "User", type: SimpleCommandOptionType.User })
    user: GuildMember,

    @SimpleCommandOption({
      name: "reason",
      type: SimpleCommandOptionType.String,
    })
    reason: string | undefined,

    command: SimpleCommandMessage,
  ) {
    const attacker = command.message.member!;

    if (!attacker.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return command.message.reply(
        this.getMessage(BanResult.MISSING_PERMISSION, user.user.username),
      );
    }

    const finalReason = reason ?? "No reason provided.";

    const result = await this.banMember(attacker, user, finalReason);

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

    interaction: CommandInteraction,
  ) {
    if (!interaction.inGuild()) return;

    const finalReason = reason ?? "No reason provided.";

    const result = await this.banMember(
      interaction.member as GuildMember,
      user,
      finalReason,
    );

    await interaction.reply(this.getMessage(result, user.user.username));
  }
}
