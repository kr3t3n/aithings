# aithings

The hub page for [aithings.online](https://aithings.online) — a small bench of free, open-source web tools.

Currently listing two tools:

| Tool | What it does | Source |
|---|---|---|
| [flatten.site](https://flatten.site) | Drop in a ZIP, get a flat file tree or one plain-text blob — for pasting a codebase into an AI context window. | [kr3t3n/flatten.site](https://github.com/kr3t3n/flatten.site) |
| [makejson.online](https://makejson.online) | Turn PDFs, DOCX, spreadsheets and code files into structured JSON, using your own AI API key. | [kr3t3n/makejson](https://github.com/kr3t3n/makejson) |

## What this repo is

One file: `index.html`. No build step, no dependencies, no JavaScript. That is the whole hub.

New tools get added one at a time, and anything nobody uses for 90 days gets retired rather than left to rot.

## Running it locally

Open `index.html` in a browser. That's it.

## Deploying

The page is a single self-contained static file, so any static host works.

**DreamHost (where `aithings.online` is hosted):** upload `index.html` to the domain's web root
(`~/aithings.online/`) via SFTP or the DreamHost file manager. No DNS change needed.

**GitHub Pages:** already enabled on this repo, serving from `main`. To attach the custom domain,
add a `CNAME` file containing `aithings.online` and point the domain's DNS at GitHub Pages.

## Support

If a tool here saved you time: [buy me a coffee](https://buymeacoffee.com/georgipep) ☕

Built by [Georgi](https://x.com/georgipep). MIT licensed.
