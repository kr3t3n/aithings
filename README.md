# aithings

The hub page for [aithings.online](https://aithings.online) — a small bench of free,
open-source web tools.

| Tool | What it does | Source |
|---|---|---|
| [flatten.site](https://flatten.site) | Drop in a ZIP, get a flat file tree or one plain-text blob — for pasting a codebase into an AI context window. | not yet published |
| [makejson.online](https://makejson.online) | Turn PDFs, DOCX, spreadsheets and code into structured JSON, using your own AI API key. | [kr3t3n/makejson](https://github.com/kr3t3n/makejson) |
| [chatmd](https://chatmd.pages.dev) | Drop a ChatGPT or Claude export ZIP, get one Markdown file per chat. | [kr3t3n/chatmd](https://github.com/kr3t3n/chatmd) |
| [tgmd](https://tgmd.pages.dev) | Drop a Telegram Desktop result.json or export ZIP, get one Markdown file per chat. | [kr3t3n/tgmd](https://github.com/kr3t3n/tgmd) |
| [igmd](https://igmd.pages.dev) | Drop a Meta Download-your-information ZIP, get one Markdown file per Instagram or Facebook chat. | [kr3t3n/igmd](https://github.com/kr3t3n/igmd) |
| [scrub](https://scrubtxt.pages.dev) | Drop or paste a log, .env, or dump; secrets become stable placeholders. | [kr3t3n/scrub](https://github.com/kr3t3n/scrub) |

## What this repo is

One file: `index.html`. No build step, no dependencies, no JavaScript, no tracking.
That is the whole hub.

New tools get added one at a time, and anything nobody uses for 90 days gets retired
rather than left to rot.

## Running it locally

Open `index.html` in a browser. That's it.

## Deploying

The page is a single self-contained static file, so any static host works.

**DreamHost — where `aithings.online` is currently served from.** The domain resolves
to DreamHost (`ns1/ns2/ns3.dreamhost.com`) and currently shows the default
"almost here!" placeholder. Upload `index.html` to the domain's web root
(`~/aithings.online/`) over SFTP or through the DreamHost file manager, replacing the
placeholder. No DNS change is needed.

**GitHub Pages.** Push this repo, then enable Pages on `main` under Settings → Pages.
To use the custom domain, add a `CNAME` file containing `aithings.online` and repoint
the domain's DNS at GitHub Pages — which means moving it off the DreamHost default.

## Support

If a tool here saved you time: [buy me a coffee](https://buymeacoffee.com/georgipep) ☕

Built by [Georgi](https://x.com/georgipep). MIT licensed.
