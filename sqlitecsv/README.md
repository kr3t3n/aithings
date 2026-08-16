# sqlitecsv

Drop a `.db` / `.sqlite` and download CSV of the tables you tick. Several tables come as a zip. Runs entirely in your browser.

Open the page, drop a SQLite file, tick tables (or All), copy or download CSV. A Markdown table is there as a second button for a small table.

**It runs entirely in your browser.** Nothing is uploaded, there is no backend, and there is no API key.

## What it does

- Accepts `.db`, `.sqlite`, and `.sqlite3` (detected from the SQLite header, not the extension)
- Opens the file with [sql.js](https://sql.js.org/) (SQLite compiled to WebAssembly)
- Lists user tables with row counts — tick the ones you want, or All
- Copy and download CSV sit on each row. Several ticked tables download as a zip
- Markdown of a small table is a second button, not the job
- Fails loudly on files that are not SQLite (`SQLite format 3`), empty databases, and encrypted files
- Not a SQL editor, query box, or schema browser

## Caps

25 MB. sql.js loads the whole database in the tab, so bigger files freeze the page.

## Privacy

The file never leaves the browser. There is no server to send it to.

## Running locally

Open `index.html` in a browser. `vendor/sql-wasm.js` and `vendor/sql-wasm.wasm` are sql.js 1.13.0 (MIT). `vendor/jszip.js` is JSZip 3.10.1 (MIT).

## License

MIT — see [LICENSE](LICENSE). sql.js and JSZip are MIT — see [vendor/NOTICE](vendor/NOTICE).

Created by [Georgi](https://x.com/georgipep) · part of [aithings.online](https://aithings.online)
