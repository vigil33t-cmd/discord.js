'use strict';

const { Routes, PermissionFlagsBits } = require('discord-api-types/v9');
const BaseGuildEmoji = require('./BaseGuildEmoji');
const { Error } = require('../errors');
const GuildEmojiRoleManager = require('../managers/GuildEmojiRoleManager');

/**
 * Represents a custom emoji.
 * @extends {BaseGuildEmoji}
 */
class GuildEmoji extends BaseGuildEmoji {
  constructor(client, data, guild) {
    super(client, data, guild);

    /**
     * The user who created this emoji
     * @type {?User}
     */
    this.author = null;

    /**
     * Array of role ids this emoji is active for
     * @name GuildEmoji#_roles
     * @type {Snowflake[]}
     * @private
     */
    Object.defineProperty(this, '_roles', { value: [], writable: true });

    this._patch(data);
  }

  /**
   * The guild this emoji is part of
   * @type {Guild}
   * @name GuildEmoji#guild
   */

  _clone() {
    const clone = super._clone();
    clone._roles = this._roles.slice();
    return clone;
  }

  _patch(data) {
    super._patch(data);

    if (data.user) this.author = this.client.users._add(data.user);
    if (data.roles) this._roles = data.roles;
  }

  /**
   * Whether the emoji is deletable by the client user
   * @type {boolean}
   * @readonly
   */
  get deletable() {
    if (!this.guild.me) throw new Error('GUILD_UNCACHED_ME');
    return !this.managed && this.guild.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers);
  }

  /**
   * A manager for roles this emoji is active for.
   * @type {GuildEmojiRoleManager}
   * @readonly
   */
  get roles() {
    return new GuildEmojiRoleManager(this);
  }

  /**
   * Fetches the author for this emoji
   * @returns {Promise<User>}
   */
  async fetchAuthor() {
    if (this.managed) {
      throw new Error('EMOJI_MANAGED');
    } else {
      if (!this.guild.me) throw new Error('GUILD_UNCACHED_ME');
      if (!this.guild.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
        throw new Error('MISSING_MANAGE_EMOJIS_AND_STICKERS_PERMISSION', this.guild);
      }
    }
    const data = await this.client.rest.get(Routes.guildEmoji(this.guild.id, this.id));
    this._patch(data);
    return this.author;
  }

  /**
   * Data for editing an emoji.
   * @typedef {Object} GuildEmojiEditData
   * @property {string} [name] The name of the emoji
   * @property {Collection<Snowflake, Role>|RoleResolvable[]} [roles] Roles to restrict emoji to
   */

  /**
   * Edits the emoji.
   * @param {GuildEmojiEditData} data The new data for the emoji
   * @param {string} [reason] Reason for editing this emoji
   * @returns {Promise<GuildEmoji>}
   * @example
   * // Edit an emoji
   * emoji.edit({ name: 'newemoji' })
   *   .then(e => console.log(`Edited emoji ${e}`))
   *   .catch(console.error);
   */
  edit(data, reason) {
    return this.guild.emojis.edit(this.id, data, reason);
  }

  /**
   * Sets the name of the emoji.
   * @param {string} name The new name for the emoji
   * @param {string} [reason] Reason for changing the emoji's name
   * @returns {Promise<GuildEmoji>}
   */
  setName(name, reason) {
    return this.edit({ name }, reason);
  }

  /**
   * Deletes the emoji.
   * @param {string} [reason] Reason for deleting the emoji
   * @returns {Promise<GuildEmoji>}
   */
  async delete(reason) {
    await this.guild.emojis.delete(this.id, reason);
    return this;
  }

  /**
   * Whether this emoji is the same as another one.
   * @param {GuildEmoji|APIEmoji} other The emoji to compare it to
   * @returns {boolean}
   */
  equals(other) {
    if (other instanceof GuildEmoji) {
      return (
        other.id === this.id &&
        other.name === this.name &&
        other.managed === this.managed &&
        other.available === this.available &&
        other.requiresColons === this.requiresColons &&
        other.roles.cache.size === this.roles.cache.size &&
        other.roles.cache.every(role => this.roles.cache.has(role.id))
      );
    } else {
      return (
        other.id === this.id &&
        other.name === this.name &&
        other.roles.length === this.roles.cache.size &&
        other.roles.every(role => this.roles.cache.has(role))
      );
    }
  }
}

module.exports = GuildEmoji;
