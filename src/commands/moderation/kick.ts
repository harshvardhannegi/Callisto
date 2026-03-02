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

enum KickResult {
  MISSING_PERMISSION,
  CANNOT_KICK,
  SUCCESS,
  ERROR,
}

@Discord()
export class Kick {
  async kickMember(
    attacker: GuildMember,
    victim: GuildMember,
  ): Promise<KickResult> {
    if (attacker.id === victim.id) {
      return KickResult.CANNOT_KICK;
    }

    if (!victim.kickable) {
      return KickResult.CANNOT_KICK;
    }

    try {
      await victim.kick();
      return KickResult.SUCCESS;
    } catch {
      return KickResult.ERROR;
    }
  }

  private getMessage(result: KickResult, username: string): string {
    switch (result) {
      case KickResult.MISSING_PERMISSION:
        return ":warning: You do not have the `KICK_MEMBERS` permission!";
      case KickResult.CANNOT_KICK:
        return ":x: Unable to kick this user!";
      case KickResult.ERROR:
        return ":x: An error occurred while kicking.";
      case KickResult.SUCCESS:
        return `✅ Successfully kicked \`${username}\`!`;
    }
  }

  @SimpleCommand({ name: "kick", description: "Kick a member." })
  async kickSC(
    @SimpleCommandOption({ name: "User", type: SimpleCommandOptionType.User })
    user: GuildMember,
    command: SimpleCommandMessage,
  ) {
    if (!user) {
      await command.sendUsageSyntax();
      return;
    }

    const attacker = command.message.member!;

    if (!attacker.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return command.message.reply(
        this.getMessage(KickResult.MISSING_PERMISSION, user.user.username),
      );
    }

    const result = await this.kickMember(attacker, user);

    await command.message.reply(this.getMessage(result, user.user.username));
  }

  @Slash({
    name: "kick",
    description: "Kick a member.",
    defaultMemberPermissions: PermissionsBitField.Flags.KickMembers,
  })
  async kickSL(
    @SlashOption({
      name: "user",
      description: "User to kick",
      required: true,
      type: ApplicationCommandOptionType.User,
    })
    user: GuildMember,
    interaction: CommandInteraction,
  ) {
    if (!interaction.inGuild()) return;

    const result = await this.kickMember(
      interaction.member as GuildMember,
      user,
    );

    await interaction.reply(this.getMessage(result, user.user.username));
  }
}
