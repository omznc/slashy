# Terms and Conditions

Effective: 2025-12-06

## About Slashy
Slashy lets Discord server admins create and manage custom slash commands through a Cloudflare Worker. By using Slashy you agree to these terms.

## Eligibility and Accounts
- You must comply with Discord’s Terms of Service and Community Guidelines.
- Access to admin endpoints requires a secret token; you are responsible for keeping it confidential.
- If you deploy or self-host, you are responsible for your environment, secrets, and compliance.

## Use of the Service
- Intended to create, list, and delete slash commands per guild.
- Do not use Slashy for spam, fraud, harassment, malware, data exfiltration, or to evade Discord policies.
- Respect guild limits and any rate limits; do not attempt to bypass them.
- You are responsible for the content of commands and replies you create.

## Data
- Stored in D1: command definitions (name, reply text, description, visibility flag, usage count, timestamps), guild metadata (premium flag, bans, max_commands, permission, joined_at).
- Processed but not persisted: interaction payloads from Discord (may include user, guild, channel, and message metadata) except for usage counts and saved command definitions.
- Admin secrets may be generated on first run and logged to your environment; keep them secure.

## Availability and Changes
- Service is provided on an as-available basis; downtime or data loss may occur.
- Features may change, be rate-limited, or be discontinued without notice.

## Third-Party Services
- Slashy depends on Discord APIs and Cloudflare; their outages or policy changes may affect the service.

## Open Source
- Slashy is released under GPL-3.0. Your use of the source is governed by that license in addition to these terms for any hosted instance you run.

## Disclaimers
- Provided “AS IS” without warranties of any kind, including uptime, accuracy, or fitness for a particular purpose.

## Limitation of Liability
- To the maximum extent permitted by law, Slashy contributors are not liable for any indirect, incidental, consequential, or punitive damages, or for loss of data, revenue, or profits.

## Indemnity
- You agree to indemnify and hold harmless the Slashy contributors from claims arising out of your use, deployment, or content created with Slashy.

## Termination
- Access may be suspended or terminated for abuse, security concerns, or legal reasons. You may stop using or hosting Slashy at any time.

## Updates
- We may update these terms; continued use after changes constitutes acceptance. Check this file for the latest version.

## Contact
- Open an issue on the repository to report problems or questions.

