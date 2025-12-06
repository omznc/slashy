# Privacy Policy

Effective: 2025-12-06

## What Slashy Processes
- Interaction payloads from Discord to handle slash commands. Payloads may include user IDs, guild IDs, channel IDs, command names, options, and message metadata.
- Stored in D1: command definitions (name, reply text, description, visibility flag, usage count, timestamps) and guild metadata (premium flag, bans, max_commands, permission, joined_at).
- Admin secrets for `/admin` endpoints; a secret may be generated on first run and logged to your environment.
- Minimal debug logs may record interaction types, guild IDs, and errors for troubleshooting.

## How Data Is Used
- To verify request signatures, route interactions, create/manage guild commands, enforce limits, and reply to users.
- Usage counts are incremented to track command executions.
- Logs are used to operate and secure the service.

## Retention
- Command and guild records persist until you delete them or drop the database.
- Logs are kept per your Cloudflare logging configuration; clear them via your platform controls.

## Sharing
- Data is sent to and from Discord APIs to register and execute commands.
- No selling or ad-based sharing. Data may be disclosed if required by law or to investigate abuse.

## Security
- Discord signatures are verified before processing.
- Admin endpoints require the secret token. Keep it private.
- Hosted on Cloudflare; platform security and your configuration affect protection.

## Your Choices
- Delete commands or reset guild commands via provided endpoints/scripts.
- Self-hosting lets you control storage, logs, and retention policies.

## Children
- Slashy is for Discord users and is not directed to children under 13 (or the minimum age in your region).

## Changes
- We may update this policy; continued use after changes means you accept the updated policy. Check this file for the latest version.

## Contact
- Open an issue on the repository for privacy questions.

