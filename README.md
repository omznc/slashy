<p align="center"><img src="https://i.imgur.com/j8rrx7R.png" style="width: 8rem;border-radius: 20%;"><h1 align="center">Slashy – Create custom slash commands on Discord</h1></p>
<p align="center" style="display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:wrap;">
  <a href="https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&scope=applications.commands%20bot&permissions=0" style="display:inline-flex;align-items:center;gap:10px;padding:18px 12px;height:42px;line-height:22px;background:black;color:#5865F2;border:3px solid #5865F2;border-radius:4px;font-weight:700;font-family:Inter,system-ui,sans-serif;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,0.25);box-sizing:border-box;">
    <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 126.644 96" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"/>
    </svg>
    Invite to Discord
  </a>
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/omznc/slashy"><img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare" style="height:42px;display:block;"></a>
</p>



## Commands
- `/slashy add` opens a modal for adding commands.
- `/slashy list` shows server commands (only for you).
- `/slashy delete <name>` lets you delete commands. Has autocomplete too.
- Created commands become real slash commands per guild; replies honor the stored visibility flag.

## Placeholders
Inside replies you can use:
- `[[user]]` mention
- `[[user.name]]`
- `[[user.avatar]]` (empty if none)

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
5) Dynamic handler fetches the command row, increments `uses`, applies placeholders, replies public or ephemeral per row.

## Weird branches
You might've noticed that this repository has 2 weird branches: `legacy` and `legacy-legacy`. 
Slashy's been worked on for a while. `legacy-legacy` was v1 written in Python, and `legacy` was running in Node.js. 
The current Slashy version (and hopefully final) runs in Cloudflare Workers off of interactions.


## Persistence
- D1 tables: `commands` (reply, description, ephemeral, uses), `guilds` (premium, banned, max_commands). Non-premium servers are capped at 30 commands by default.

## Maintenance scripts
- `bun run scripts/register-base.ts` registers the base `/slashy` command globally or for `GUILD_ID=...`.
- `bun run scripts/reset-commands.ts` resets global `/slashy` and rebuilds commands for the listed guild IDs.
## Admin endpoints (worker)
- Auth: `Authorization: Bearer <SLASHY_SECRET>` or `?secret=...` or `x-slashy-secret`.
- Secret: set `SLASHY_SECRET` or let the worker log a generated one on first boot.
- `GET /admin/register-base` registers `/slashy` globally.
- `GET /admin/reset-commands?guildId=123,456` resets global `/slashy` and recreates guild commands (excluding `/slashy`) for listed guilds.

## Env / secrets
- `DISCORD_TOKEN`, `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY` secrets in Wrangler.
- `DB` D1 binding name must match `wrangler.toml`.
- `SLASHY_SECRET` for admin endpoints (optional; auto-generated if absent).
- Optional: `GUILD_ID` when running register/reset scripts for scoped testing.
- Copy `.dev.vars.example` to `.dev.vars` (or set secrets in dashboard) so the deploy button prompts for them.

## Local dev
- `bun install`
- `wrangler d1 migrations apply slashy`
- `wrangler secret put DISCORD_TOKEN`, `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`
- `bun dev -- --remote` (or `bunx wrangler dev src/worker.ts --remote` to hit real Discord)

## Data model
- `commands`: `id`, `guild_id`, `name` (unique per guild), `reply`, `description` (<=100), `ephemeral` (0/1), `uses`, timestamps.
- `guilds`: `id`, `premium`, `banned`, `max_commands` (default 30), `permission`, `joined_at`.

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