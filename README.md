<p align="center"><img src="https://i.imgur.com/j8rrx7R.png" style="width: 8rem;border-radius: 20%;"><h1 align="center">Slashy – Create custom slash commands on Discord</h1></p>
<p align="center" style="display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:wrap;">
    <a href="https://discord.com/api/oauth2/authorize?client_id=928089024252506173&scope=applications.commands%20bot&permissions=0"><img src="media/invite-to-discord-button.svg" alt="Invite to Discord" style="height:42px;display:block;"></a>
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/omznc/slashy"><img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare" style="height:42px;display:block;"></a>
</p>

Slashy is the first free and open-source Discord bot that allows you to create custom slash commands. It's been around since 2022 and you can track it's progress through the publicly available code.

Slashy's main feature is creating slash commands without being tech savy, or if you just want an easier way to add commands to your server. It supports full command editing through a modal, and the changes are reflected instantly.

Yes, I know, Slashy is a super creative name. I'm not the best at naming things, but I'm sure you'll love it anyway!

Couple of cool features:
  - command adding, editing, deleting and listing (for admins/managers)
  - tracking the usages of each command (for admins/managers, or the bot host via PostHog)
  - ephemeral replies (only the person that runs the command gets to see its reply)
  - full internationalization ([all Discord locales  are supported](https://discord.com/developers/docs/reference#locales))
  - admin endpoints (limiting the number of commands per-guild, and banning guilds)

The publicly-hosted version of Slashy can be [added with this link](https://discord.com/api/oauth2/authorize?client_id=928089024252506173&scope=applications.commands%20bot&permissions=0), or the button in the header. You can also (pretty easily) host it yourself if you'd like.

Have fun.



https://github.com/user-attachments/assets/2ced7d0e-7fbc-4fa9-b6e9-2722d79a5863






## Commands
- `/slashy add` opens a modal for adding commands.
- `/slashy list` shows server commands (only for you).
- `/slashy delete <name>` lets you delete commands. Has autocomplete.
- `/slashy edit <name>` edit a command. Has autocomplete too.

- Created commands become real slash commands per guild; replies honor the stored visibility flag.

## Placeholders
Command replies can have placeholders, check out the full list in [`PLACEHOLDERS.md`](./PLACEHOLDERS.md).

# For developers

## Stack
- Cloudflare Worker entrypoint `src/worker.ts`, Bun toolchain, Wrangler deploy.
- Discord interactions only; Ed25519 verified in `utils/verify.ts`.
- D1 binding `DB` for commands and guild metadata.
- REST client (`discord/rest-client.ts`) for registering commands on the fly.

## Interaction flow
1) `worker.fetch` rejects invalid signatures, logs minimal debug, builds context.
2) `router` handles ping, autocomplete, modal submit, `/slashy` subcommands, or dynamic commands.
3) `/slashy` requests run `ensureBaseCommand` to keep the root command in sync.
4) Modal submit sanitizes name, enforces Manage Server, guild limits, saves to D1, registers/patches the guild command, replies ephemeral.
5) Dynamic handler fetches the command row, increments `uses`, applies placeholders, replies public or ephemeral per row. If `POSTHOG_KEY` is set, PostHog captures command lifecycle events (create, delete, list, run).

## Weird branches
You might've noticed that this repository has 2 weird branches: `legacy` and `legacy-legacy`. 
Slashy's been worked on for a while. `legacy-legacy` was v1 written in Python, and `legacy` was running in Node.js. 
The current Slashy version (and hopefully final) runs in Cloudflare Workers off of interactions.


## Persistence
- D1 tables: `commands` (reply, description, ephemeral, uses), `guilds` (max_commands, banned). Guilds default to 50 commands; raise the default with `MAX_COMMANDS`.

## Maintenance scripts
- `bun run scripts/register-base.ts` registers the base `/slashy` command globally or for `GUILD_ID=...`.
- `bun run scripts/reset-commands.ts` resets global `/slashy` and rebuilds commands for the listed guild IDs.
## Admin endpoints (worker)
- Auth: `Authorization: Bearer <SLASHY_SECRET>` or `?secret=...` or `x-slashy-secret`.
- Secret: set `SLASHY_SECRET` or let the worker log a generated one on first boot.
- `GET /admin/register-base` registers `/slashy` globally.
- `GET /admin/reset-commands?guildId=123,456` resets global `/slashy` and recreates guild commands (excluding `/slashy`) for listed guilds.
- `POST /admin/guild-limit` sets a guild's max commands; body `{ "guildId": "123", "limit": 50 }` (query params also work).
- `POST /admin/guild-ban` sets banned flag; body `{ "guildId": "123", "banned": true }` (query params also work).

## Env / secrets
- `DISCORD_TOKEN`, `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY` secrets in Wrangler.
- `DB` D1 binding name must match `wrangler.toml`.
- `SLASHY_SECRET` for admin endpoints (optional; auto-generated if absent).
- Optional: `POSTHOG_KEY` to enable analytics; `POSTHOG_HOST` defaults to `https://eu.i.posthog.com`.
- Optional: `MAX_COMMANDS` to change the default per-guild cap (default 50).
- Optional: `GUILD_ID` when running register/reset scripts for scoped testing.
- Copy `.dev.vars.example` to `.dev.vars` (or set secrets in dashboard) so the deploy button prompts for them.

## Local dev
- `bun install`
- `wrangler d1 migrations apply slashy`
- `wrangler secret put DISCORD_TOKEN`, `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`
- `bun dev -- --remote` (or `bunx wrangler dev src/worker.ts --remote` to hit real Discord)

## Data model
- `commands`: `id`, `guild_id`, `name` (unique per guild), `reply`, `description` (<=100), `ephemeral` (0/1), `uses`, timestamps.
- `guilds`: `id`, `banned`, `max_commands` (default 50, override with `MAX_COMMANDS`), `joined_at`.

## Notes
- Lint/format: `bun run check` (Biome).
- Deploy: `bun run deploy`.

## Self-hosting (TL;DR)
- Bun + Wrangler installed, Cloudflare D1 database bound as `DB` (see `wrangler.toml`).
- Discord app with bot token and public key.
- Secrets: `wrangler secret put DISCORD_TOKEN`, `wrangler secret put DISCORD_APP_ID`, `wrangler secret put DISCORD_PUBLIC_KEY`.
- DB schema: `wrangler d1 migrations apply slashy`.
- Admin secret: set `SLASHY_SECRET` or read the generated one from worker logs on first boot.
- Register `/slashy`: `curl -H "Authorization: Bearer $SLASHY_SECRET" https://your-worker/admin/register-base`.
- Dev: `bun dev -- --remote` (or `bunx wrangler dev src/worker.ts --remote`).
- Deploy: `bun run deploy`.

## License
GPL-3.0.
