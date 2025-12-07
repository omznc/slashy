# Placeholders

These resolve inside command replies. Nested placeholders are allowed; evaluation runs a few passes until values stop changing.

## User, channel, guild
| Placeholder | Description | Example |
| --- | --- | --- |
| `[[user]]`, `[[user.mention]]` | Mention of the user who ran the command | `<@123>` |
| `[[user.id]]` | User ID | `1234567890` |
| `[[user.name]]`, `[[user.username]]` | Username | `spacedude` |
| `[[user.global_name]]` | Global display name | `Space Dude` |
| `[[user.nickname]]` | Guild nickname | `nick` |
| `[[user.display]]`, `[[user.display_name]]` | Preferred display name (nick → global → username) | `nick` |
| `[[user.avatar]]` | Avatar URL (empty if none) | `https://cdn.discordapp.com/avatars/...` |
| `[[channel.id]]`, `[[channel.mention]]` | Channel ID / mention (current channel) | `1234567890`, `<#1234567890>` |
| `[[channel.mention:<id>]]` | Mention channel by ID | `<#1234567890>` |
| `[[server.id]]` | Server/Guild ID | `9876543210` |
| `[[role.mention:<id>]]` | Mention role by ID | `<@&5555>` |
| `[[command.name]]` | Command name | `ping` |
| `[[locale]]` | Locale of the invoker or guild | `en-US` |
| `[[locale.name]]` | Locale language code | `en` |
| `[[locale.region]]` | Locale region code | `US` |

## Random and picks
| Placeholder | Description | Example |
| --- | --- | --- |
| `[[random]]` | Random int 1–100 | `42` |
| `[[random:<max>]]` | Random int 1–`max` | `[[random:5]]` → `3` |
| `[[random:<min>:<max>]]` | Random int `min`–`max` | `[[random:15:30]]` → `22` |
| `[[rand.pick:a,b,c]]` | Pick one of the comma-separated options | `a` |
| `[[rand.weighted:a=1,b=3,c=6]]` | Pick with weights | `c` |
| `[[rand.emoji]]` | Random emoji from the default set | `😀` |
| `[[rand.emoji:set=party]]` | Random emoji from a named set (`default`, `party`, `faces`) | `🎉` |

Emoji sets for `[[rand.emoji]]`:

- `default`: 😀, 😅, 😎, 🤔, 😴, 🤖, 🔥, 🎉, 🚀, ✨  
- `party`: 🎉, 🥳, 🎊, 🍾, 🎂, 🪩, 🎈, 🕺, 💃, ✨  
- `faces`: 😀, 😅, 😂, 😊, 😍, 🤔, 😴, 😭, 😡, 🤯  


## IDs
| Placeholder | Description | Example |
| --- | --- | --- |
| `[[uuid]]` | Random UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `[[shortid]]` | Short random ID | `k3j9ab1c` |

## Time
| Placeholder | Description | Example |
| --- | --- | --- |
| `[[now]]` | Current time ISO | `2024-05-01T12:00:00.000Z` |
| `[[now:unix]]` | Unix seconds | `1714564800` |
| `[[now:tag]]` | Discord time tag (defaults to short time) | `<t:1714564800>` |
| `[[now:tag:R]]` | Discord time tag with style (`t`,`T`,`d`,`D`,`f`,`F`,`R`) | `<t:1714564800:R>` |
| `[[now:fmt:%Y-%m-%d]]` | Format with a strftime-like pattern | `2024-05-01` |
| `[[now:fmt:locale-default]]` | Locale-aware default formatting | `5/1/2024, 8:00 AM` |
| `[[now:tz:America/New_York:fmt:%I:%M %p]]` | Format in a specific time zone | `08:00 AM` |
| `[[now:rel]]` | Relative “now” string | `in 0 seconds` |

Supported pattern tokens: `%Y`, `%y`, `%m`, `%d`, `%H`, `%M`, `%S`, `%I`, `%p`, `%b`, `%B`, `%a`, `%A`, `%Z`.

## LaTeX
| Placeholder | Description | Example |
| --- | --- | --- |
| `[[latex.inline:E=mc^2]]` | Inline TeX (with surrounding `$`) | `$E=mc^2$` |
| `[[latex.block:\int_0^1 x^2 dx]]` | Block TeX (with `$$`) | `$$\int_0^1 x^2 dx$$` |
| `[[latex:E=mc^2]]` | URL to rendered PNG via latex.codecogs.com | `https://latex.codecogs.com/png.image?E%3Dmc%5E2` |

## Math
| Placeholder | Description | Example |
| --- | --- | --- |
| `[[math:1+2*3]]` | Evaluates expression | `7` |
| `[[math:ceil(3.2)]]` | Math helpers: `abs`, `ceil`, `floor`, `round`, `trunc`, `sign`, `sqrt`, `cbrt`, `pow`, `exp`, `log`, `min`, `max`, trig/atan/atan2, `PI`, `E` | `4` |

## String helpers
| Placeholder | Description | Example |
| --- | --- | --- |
| `[[upper:text]]` | Uppercase | `[[upper:hey]]` → `HEY` |
| `[[lower:text]]` | Lowercase | `[[lower:Hey]]` → `hey` |
| `[[title:text]]` | Title case | `[[title:hey there]]` → `Hey There` |
| `[[truncate:len:text]]` | Truncate to `len` characters | `[[truncate:5:hellothere]]` → `hello` |
| `[[slice:start:end:text]]` | JS-like slice | `[[slice:1:4:hello]]` → `ell` |
| `[[urlencode:text]]` | URL encode | `[[urlencode:a b]]` → `a%20b` |
| `[[urldecode:text]]` | URL decode | `[[urldecode:a%20b]]` → `a b` |

## Conditionals
| Placeholder | Description | Example |
| --- | --- | --- |
| `[[if:condition?yes:no]]` | Truthy check on `condition` (`0`, `false`, `no`, `off`, `nil`, `null`, `undefined` are falsey) | `[[if:[[user.nickname]]?hi:bye]]` → `hi` |

