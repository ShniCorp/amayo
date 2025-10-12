// filepath: src/core/patches/discordModalPatch.ts
/*
  Runtime patch for discord.js 15.0.0-dev to avoid crashes when ModalSubmitInteraction
  tries to cache members from resolved.members lacking the `user` field.
  Source of truth: node_modules/discord.js/src/structures/ModalSubmitInteraction.js
*/
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Collection } = require("@discordjs/collection");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ModalModule = (() => {
  try {
    const djs = require("discord.js");
    if (djs.ModalSubmitInteraction)
      return { ModalSubmitInteraction: djs.ModalSubmitInteraction };
    if (djs.structures && djs.structures.ModalSubmitInteraction)
      return { ModalSubmitInteraction: djs.structures.ModalSubmitInteraction };
    // Try to resolve internal path at runtime without static import
    return require(require.resolve(
      "discord.js/src/structures/ModalSubmitInteraction.js"
    ));
  } catch {
    try {
      // Fallback to node_modules relative path if needed
      return require("../../../node_modules/discord.js/src/structures/ModalSubmitInteraction.js");
    } catch {
      return null;
    }
  }
})();

export function applyModalSubmitInteractionPatch() {
  const ModalSubmitInteraction = ModalModule?.ModalSubmitInteraction;
  if (!ModalSubmitInteraction || typeof ModalSubmitInteraction !== "function") {
    return; // Nothing to patch
  }

  const original = ModalSubmitInteraction.prototype.transformComponent;

  // Override with a safer version
  // eslint-disable-next-line func-names
  ModalSubmitInteraction.prototype.transformComponent = function (
    rawComponent: any,
    resolved: any
  ) {
    if ("components" in rawComponent) {
      return {
        type: rawComponent.type,
        id: rawComponent.id,
        components: rawComponent.components.map((component: any) =>
          this.transformComponent(component, resolved)
        ),
      };
    }

    if ("component" in rawComponent) {
      return {
        type: rawComponent.type,
        id: rawComponent.id,
        component: this.transformComponent(rawComponent.component, resolved),
      };
    }

    const data: any = {
      type: rawComponent.type,
      id: rawComponent.id,
    };

    if ("custom_id" in rawComponent) data.customId = rawComponent.custom_id;
    if ("value" in rawComponent) data.value = rawComponent.value;

    if (rawComponent.values) {
      data.values = rawComponent.values;

      if (resolved) {
        const collect = (
          resolvedData: any,
          resolver: (val: any, id: string) => any
        ) => {
          const collection = new Collection();
          for (const value of data.values as string[]) {
            if (resolvedData?.[value]) {
              const resolvedVal = resolver(resolvedData[value], value);
              if (resolvedVal) collection.set(value, resolvedVal);
            }
          }
          return collection.size ? collection : null;
        };

        const users = collect(resolved.users, (user: any) =>
          this.client.users._add(user)
        );
        if (users) data.users = users;

        const channels = collect(
          resolved.channels,
          (channel: any) =>
            this.client.channels._add(channel, this.guild) ?? channel
        );
        if (channels) data.channels = channels;

        // SAFE members resolution: ensure member.user exists or skip _add fallbacking to raw
        const members = collect(resolved.members, (member: any, id: string) => {
          try {
            if (!member?.user && resolved.users?.[id]) {
              member.user = resolved.users[id];
            }
            // If still no user, don't call _add which would crash; return raw member
            if (!member?.user) return member;
            return this.guild?.members._add(member) ?? member;
          } catch {
            return member;
          }
        });
        if (members) data.members = members;

        const roles = collect(
          resolved.roles,
          (role: any) => this.guild?.roles._add(role) ?? role
        );
        if (roles) data.roles = roles;
      }
    }

    return data;
  };

  // Keep a reference in case we need to restore
  (ModalSubmitInteraction.prototype as any).__originalTransformComponent =
    original;
}
