import { Discord, On, type ArgsOf, type Client } from "discordx";

@Discord()
export class Example {
  @On()
  messageCreate([message]: ArgsOf<"messageCreate">, client: Client): void {
    console.log(
      "Message Created",
      message.author.username,
      message.cleanContent,
    );
  }
}
