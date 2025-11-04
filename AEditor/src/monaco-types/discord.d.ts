// Declaraciones básicas de Discord.js para autocompletado en Monaco Editor

declare module "discord.js" {
  // Client
  export class Client {
    constructor(options: ClientOptions);
    login(token: string): Promise<string>;
    destroy(): void;
    user: ClientUser | null;
    guilds: GuildManager;
    channels: ChannelManager;
    users: UserManager;
    on<K extends keyof ClientEvents>(
      event: K,
      listener: (...args: ClientEvents[K]) => void
    ): this;
    once<K extends keyof ClientEvents>(
      event: K,
      listener: (...args: ClientEvents[K]) => void
    ): this;
  }

  export interface ClientOptions {
    intents: GatewayIntentBits[];
  }

  export enum GatewayIntentBits {
    Guilds = 1 << 0,
    GuildMembers = 1 << 1,
    GuildBans = 1 << 2,
    GuildEmojisAndStickers = 1 << 3,
    GuildIntegrations = 1 << 4,
    GuildWebhooks = 1 << 5,
    GuildInvites = 1 << 6,
    GuildVoiceStates = 1 << 7,
    GuildPresences = 1 << 8,
    GuildMessages = 1 << 9,
    GuildMessageReactions = 1 << 10,
    GuildMessageTyping = 1 << 11,
    DirectMessages = 1 << 12,
    DirectMessageReactions = 1 << 13,
    DirectMessageTyping = 1 << 14,
    MessageContent = 1 << 15,
    GuildScheduledEvents = 1 << 16,
    AutoModerationConfiguration = 1 << 20,
    AutoModerationExecution = 1 << 21,
  }

  // User & ClientUser
  export class User {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    bot: boolean;
    tag: string;
    displayAvatarURL(options?: ImageURLOptions): string;
    send(options: MessageCreateOptions): Promise<Message>;
  }

  export class ClientUser extends User {
    setActivity(name: string, options?: ActivityOptions): Presence;
    setStatus(status: PresenceStatusData): Presence;
    setPresence(presence: PresenceData): Presence;
  }

  // Message
  export class Message {
    id: string;
    content: string;
    author: User;
    channel: TextChannel | DMChannel;
    guild: Guild | null;
    member: GuildMember | null;
    createdTimestamp: number;
    createdAt: Date;
    attachments: Collection<string, Attachment>;
    embeds: Embed[];
    mentions: MessageMentions;
    reply(options: MessageReplyOptions): Promise<Message>;
    delete(): Promise<Message>;
    edit(options: MessageEditOptions): Promise<Message>;
    react(emoji: string): Promise<MessageReaction>;
  }

  export interface MessageCreateOptions {
    content?: string;
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<any>[];
    files?: AttachmentBuilder[];
    ephemeral?: boolean;
  }

  export interface MessageReplyOptions extends MessageCreateOptions {}
  export interface MessageEditOptions extends MessageCreateOptions {}

  // Guild
  export class Guild {
    id: string;
    name: string;
    icon: string | null;
    ownerId: string;
    memberCount: number;
    channels: GuildChannelManager;
    members: GuildMemberManager;
    roles: RoleManager;
    emojis: GuildEmojiManager;
    leave(): Promise<Guild>;
  }

  // GuildMember
  export class GuildMember {
    id: string;
    user: User;
    nickname: string | null;
    displayName: string;
    roles: GuildMemberRoleManager;
    permissions: PermissionsBitField;
    joinedTimestamp: number | null;
    kick(reason?: string): Promise<GuildMember>;
    ban(options?: BanOptions): Promise<GuildMember>;
    timeout(duration: number, reason?: string): Promise<GuildMember>;
    send(options: MessageCreateOptions): Promise<Message>;
  }

  export interface BanOptions {
    reason?: string;
    deleteMessageDays?: number;
  }

  // Interaction
  export class Interaction {
    id: string;
    type: InteractionType;
    user: User;
    guild: Guild | null;
    channel: TextChannel | null;
    member: GuildMember | null;
    isButton(): this is ButtonInteraction;
    isChatInputCommand(): this is ChatInputCommandInteraction;
    isStringSelectMenu(): this is StringSelectMenuInteraction;
    isModalSubmit(): this is ModalSubmitInteraction;
  }

  export class ChatInputCommandInteraction extends Interaction {
    commandName: string;
    options: CommandInteractionOptionResolver;
    reply(options: InteractionReplyOptions): Promise<void>;
    deferReply(options?: InteractionDeferReplyOptions): Promise<void>;
    editReply(options: InteractionEditReplyOptions): Promise<Message>;
    followUp(options: InteractionReplyOptions): Promise<Message>;
    deleteReply(): Promise<void>;
  }

  export class ButtonInteraction extends Interaction {
    customId: string;
    reply(options: InteractionReplyOptions): Promise<void>;
    deferReply(options?: InteractionDeferReplyOptions): Promise<void>;
    update(options: InteractionUpdateOptions): Promise<void>;
  }

  export class StringSelectMenuInteraction extends Interaction {
    customId: string;
    values: string[];
    reply(options: InteractionReplyOptions): Promise<void>;
    update(options: InteractionUpdateOptions): Promise<void>;
  }

  export class ModalSubmitInteraction extends Interaction {
    customId: string;
    fields: ModalSubmitFields;
    reply(options: InteractionReplyOptions): Promise<void>;
  }

  export interface InteractionReplyOptions {
    content?: string;
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<any>[];
    ephemeral?: boolean;
    files?: AttachmentBuilder[];
  }

  export interface InteractionDeferReplyOptions {
    ephemeral?: boolean;
  }

  export interface InteractionEditReplyOptions
    extends InteractionReplyOptions {}
  export interface InteractionUpdateOptions extends InteractionReplyOptions {}

  // Embed
  export class EmbedBuilder {
    constructor(data?: object);
    setTitle(title: string): this;
    setDescription(description: string): this;
    setColor(color: string | number): this;
    setAuthor(options: EmbedAuthorOptions): this;
    setFooter(options: EmbedFooterOptions): this;
    setImage(url: string): this;
    setThumbnail(url: string): this;
    setTimestamp(timestamp?: Date | number): this;
    setURL(url: string): this;
    addFields(...fields: EmbedField[]): this;
  }

  export interface EmbedAuthorOptions {
    name: string;
    iconURL?: string;
    url?: string;
  }

  export interface EmbedFooterOptions {
    text: string;
    iconURL?: string;
  }

  export interface EmbedField {
    name: string;
    value: string;
    inline?: boolean;
  }

  // Buttons
  export class ButtonBuilder {
    constructor(data?: object);
    setCustomId(customId: string): this;
    setLabel(label: string): this;
    setStyle(style: ButtonStyle): this;
    setEmoji(emoji: string): this;
    setURL(url: string): this;
    setDisabled(disabled: boolean): this;
  }

  export enum ButtonStyle {
    Primary = 1,
    Secondary = 2,
    Success = 3,
    Danger = 4,
    Link = 5,
  }

  // Select Menus
  export class StringSelectMenuBuilder {
    constructor(data?: object);
    setCustomId(customId: string): this;
    setPlaceholder(placeholder: string): this;
    addOptions(...options: StringSelectMenuOptionBuilder[]): this;
    setMinValues(minValues: number): this;
    setMaxValues(maxValues: number): this;
    setDisabled(disabled: boolean): this;
  }

  export class StringSelectMenuOptionBuilder {
    constructor(data?: object);
    setLabel(label: string): this;
    setValue(value: string): this;
    setDescription(description: string): this;
    setEmoji(emoji: string): this;
    setDefault(isDefault: boolean): this;
  }

  // Modal
  export class ModalBuilder {
    constructor(data?: object);
    setCustomId(customId: string): this;
    setTitle(title: string): this;
    addComponents(...components: ActionRowBuilder<TextInputBuilder>[]): this;
  }

  export class TextInputBuilder {
    constructor(data?: object);
    setCustomId(customId: string): this;
    setLabel(label: string): this;
    setStyle(style: TextInputStyle): this;
    setPlaceholder(placeholder: string): this;
    setValue(value: string): this;
    setRequired(required: boolean): this;
    setMinLength(minLength: number): this;
    setMaxLength(maxLength: number): this;
  }

  export enum TextInputStyle {
    Short = 1,
    Paragraph = 2,
  }

  // Action Row
  export class ActionRowBuilder<T> {
    constructor(data?: object);
    addComponents(...components: T[]): this;
  }

  // Attachment
  export class AttachmentBuilder {
    constructor(
      attachment: Buffer | string,
      options?: AttachmentBuilderOptions
    );
    setName(name: string): this;
    setDescription(description: string): this;
  }

  export interface AttachmentBuilderOptions {
    name?: string;
    description?: string;
  }

  // Permissions
  export class PermissionsBitField {
    has(permission: bigint | string, checkAdmin?: boolean): boolean;
    add(...permissions: bigint[]): this;
    remove(...permissions: bigint[]): this;
  }

  export enum PermissionFlagsBits {
    CreateInstantInvite = 1n << 0n,
    KickMembers = 1n << 1n,
    BanMembers = 1n << 2n,
    Administrator = 1n << 3n,
    ManageChannels = 1n << 4n,
    ManageGuild = 1n << 5n,
    AddReactions = 1n << 6n,
    ViewAuditLog = 1n << 7n,
    ViewChannel = 1n << 10n,
    SendMessages = 1n << 11n,
    ManageMessages = 1n << 13n,
    EmbedLinks = 1n << 14n,
    AttachFiles = 1n << 15n,
    ReadMessageHistory = 1n << 16n,
    MentionEveryone = 1n << 17n,
    Connect = 1n << 20n,
    Speak = 1n << 21n,
    MuteMembers = 1n << 22n,
    DeafenMembers = 1n << 23n,
    MoveMembers = 1n << 24n,
    ManageRoles = 1n << 28n,
  }

  // Channels
  export class TextChannel {
    id: string;
    name: string;
    type: ChannelType;
    guild: Guild;
    send(options: MessageCreateOptions): Promise<Message>;
    bulkDelete(
      messages: number | Message[]
    ): Promise<Collection<string, Message>>;
  }

  export enum ChannelType {
    GuildText = 0,
    DM = 1,
    GuildVoice = 2,
    GuildCategory = 4,
    GuildAnnouncement = 5,
    GuildStageVoice = 13,
    GuildForum = 15,
  }

  // Managers
  export class GuildManager {
    cache: Collection<string, Guild>;
    fetch(id: string): Promise<Guild>;
  }

  export class ChannelManager {
    cache: Collection<string, any>;
    fetch(id: string): Promise<any>;
  }

  export class UserManager {
    cache: Collection<string, User>;
    fetch(id: string): Promise<User>;
  }

  export class GuildChannelManager {
    cache: Collection<string, any>;
    create(options: GuildChannelCreateOptions): Promise<any>;
  }

  export interface GuildChannelCreateOptions {
    name: string;
    type?: ChannelType;
    topic?: string;
    parent?: string;
  }

  export class GuildMemberManager {
    cache: Collection<string, GuildMember>;
    fetch(id: string): Promise<GuildMember>;
    ban(user: string, options?: BanOptions): Promise<void>;
    unban(user: string, reason?: string): Promise<void>;
  }

  export class RoleManager {
    cache: Collection<string, Role>;
    create(options: RoleCreateOptions): Promise<Role>;
  }

  export interface RoleCreateOptions {
    name?: string;
    color?: string | number;
    permissions?: bigint[];
    hoist?: boolean;
    mentionable?: boolean;
  }

  export class GuildMemberRoleManager {
    cache: Collection<string, Role>;
    add(role: string | Role, reason?: string): Promise<GuildMember>;
    remove(role: string | Role, reason?: string): Promise<GuildMember>;
  }

  export class GuildEmojiManager {
    cache: Collection<string, GuildEmoji>;
    create(options: GuildEmojiCreateOptions): Promise<GuildEmoji>;
  }

  // Collection
  export class Collection<K, V> extends Map<K, V> {
    filter(
      fn: (value: V, key: K, collection: this) => boolean
    ): Collection<K, V>;
    map<T>(fn: (value: V, key: K, collection: this) => T): T[];
    find(fn: (value: V, key: K, collection: this) => boolean): V | undefined;
    first(): V | undefined;
    first(amount: number): V[];
    random(): V | undefined;
  }

  // Events
  export interface ClientEvents {
    ready: [client: Client];
    messageCreate: [message: Message];
    messageDelete: [message: Message];
    messageUpdate: [oldMessage: Message, newMessage: Message];
    interactionCreate: [interaction: Interaction];
    guildMemberAdd: [member: GuildMember];
    guildMemberRemove: [member: GuildMember];
    guildCreate: [guild: Guild];
    guildDelete: [guild: Guild];
  }

  // Otros tipos
  export class Role {
    id: string;
    name: string;
    color: number;
    permissions: PermissionsBitField;
  }

  export class GuildEmoji {
    id: string;
    name: string;
    animated: boolean;
  }

  export interface GuildEmojiCreateOptions {
    attachment: Buffer | string;
    name: string;
  }

  export class MessageMentions {
    users: Collection<string, User>;
    members: Collection<string, GuildMember>;
    channels: Collection<string, any>;
    roles: Collection<string, Role>;
  }

  export class MessageReaction {
    emoji: GuildEmoji | string;
    count: number;
    me: boolean;
  }

  export class Attachment {
    id: string;
    name: string;
    url: string;
    size: number;
  }

  export class Embed {
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    timestamp?: string;
    fields: EmbedField[];
  }

  export class DMChannel {
    id: string;
    type: ChannelType;
    recipient: User;
    send(options: MessageCreateOptions): Promise<Message>;
  }

  export class CommandInteractionOptionResolver {
    getString(name: string, required?: boolean): string | null;
    getInteger(name: string, required?: boolean): number | null;
    getBoolean(name: string, required?: boolean): boolean | null;
    getUser(name: string, required?: boolean): User | null;
    getMember(name: string): GuildMember | null;
    getChannel(name: string): any | null;
    getRole(name: string): Role | null;
  }

  export class ModalSubmitFields {
    getTextInputValue(customId: string): string;
  }

  export enum InteractionType {
    Ping = 1,
    ApplicationCommand = 2,
    MessageComponent = 3,
    ApplicationCommandAutocomplete = 4,
    ModalSubmit = 5,
  }

  export enum ApplicationCommandOptionType {
    SubCommand = 1,
    SubCommandGroup = 2,
    String = 3,
    Integer = 4,
    Boolean = 5,
    User = 6,
    Channel = 7,
    Role = 8,
    Mentionable = 9,
    Number = 10,
    Attachment = 11,
  }

  export interface ActivityOptions {
    type?: ActivityType;
  }

  export enum ActivityType {
    Playing = 0,
    Streaming = 1,
    Listening = 2,
    Watching = 3,
    Competing = 5,
  }

  export type PresenceStatusData = "online" | "idle" | "dnd" | "invisible";

  export interface PresenceData {
    status?: PresenceStatusData;
    activities?: ActivityOptions[];
  }

  export class Presence {
    status: PresenceStatusData;
    activities: ActivityOptions[];
  }

  export interface ImageURLOptions {
    format?: "png" | "jpg" | "jpeg" | "webp" | "gif";
    size?: 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;
  }
}
