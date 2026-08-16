# aithings

The hub page for [aithings.online](https://aithings.online) — a small bench of free,
open-source web tools.

| Tool | What it does | Source |
|---|---|---|
| [flatten.site](https://flatten.site) | Drop in a ZIP, get a flat file tree or one plain-text blob — for pasting a codebase into an AI context window. | not yet published |
| [makejson.online](https://makejson.online) | Turn PDFs, DOCX, spreadsheets and code into structured JSON, using your own AI API key. | [kr3t3n/makejson](https://github.com/kr3t3n/makejson) |
| [chatmd](https://aithings.online/chatmd/) | Drop a ChatGPT or Claude export ZIP, get one Markdown file per chat. | [kr3t3n/chatmd](https://github.com/kr3t3n/chatmd) |
| [tgmd](https://aithings.online/tgmd/) | Drop a Telegram Desktop result.json or export ZIP, get one Markdown file per chat. | [kr3t3n/tgmd](https://github.com/kr3t3n/tgmd) |
| [igmd](https://aithings.online/igmd/) | Drop a Meta Download-your-information ZIP, get one Markdown file per Instagram or Facebook chat. | [kr3t3n/igmd](https://github.com/kr3t3n/igmd) |
| [scrub](https://aithings.online/scrub/) | Drop or paste a log, .env, or dump; secrets become stable placeholders. | [kr3t3n/scrub](https://github.com/kr3t3n/scrub) |
| [nbmd](https://aithings.online/nbmd/) | Drop a Jupyter .ipynb, get Markdown of code + notes. Plots stripped. | [kr3t3n/nbmd](https://github.com/kr3t3n/nbmd) |
| [heicjpg](https://aithings.online/heicjpg/) | Drop iPhone .heic photos, get JPEGs. | [kr3t3n/heicjpg](https://github.com/kr3t3n/heicjpg) |
| [healthcsv](https://aithings.online/healthcsv/) | Drop an Apple Health export, pick types + dates, get a compact CSV/JSON. | [kr3t3n/healthcsv](https://github.com/kr3t3n/healthcsv) |

## What this repo is

The hub `index.html` plus a static copy of each tool that has no own domain,
served as a folder on aithings.online:

- `/chatmd/`
- `/tgmd/`
- `/igmd/`
- `/scrub/`
- `/nbmd/`
- `/heicjpg/`
- `/healthcsv/`

flatten.site and makejson.online stay on their own domains. Source of truth for
each tool is still its own repo; this tree is the public folder host.

New tools get added one at a time, and anything nobody uses for 90 days gets retired
rather than left to rot.

## Running it locally

Open `index.html` in a browser, or serve the repo root so the folder paths resolve.

## Deploying

Cloudflare Pages project `aithings`. The public host is `aithings.online`
(and `aithings.pages.dev`). Direct-upload the static tree.

## Support

If a tool here saved you time: [buy me a coffee](https://buymeacoffee.com/georgipep) ☕

Built by [Georgi](https://x.com/georgipep). MIT licensed.
