/* tgmd — parse Telegram Desktop export JSON to markdown */
(function (root) {
  "use strict";

  var MAX_ZIP_BYTES = 50 * 1024 * 1024;
  var MAX_JSON_BYTES = 50 * 1024 * 1024;
  var MAX_ENTRIES = 200;
  var MAX_CHATS = 4000;
  var NEED_EXPORT = "This is not a Telegram export. Telegram Desktop export (result.json) required.";

  function ExportError(message) {
    this.name = "ExportError";
    this.message = message;
  }
  ExportError.prototype = Object.create(Error.prototype);
  ExportError.prototype.constructor = ExportError;

  function basename(path) {
    var parts = String(path).split("/");
    return parts[parts.length - 1] || path;
  }

  function isJunkPath(path) {
    return /(^|\/)__MACOSX(\/|$)/.test(path) || /(^|\/)\.DS_Store$/.test(path);
  }

  function isResultJson(path) {
    if (isJunkPath(path)) return false;
    return basename(path) === "result.json";
  }

  function sanitiseFilename(name) {
    var s = String(name || "untitled")
      .replace(/[\/\\:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\.+/, "")
      .slice(0, 80);
    return s || "untitled";
  }

  function uniqueFilenames(chats) {
    var used = Object.create(null);
    return chats.map(function (chat) {
      var base = sanitiseFilename(chat.title);
      var name = base + ".md";
      var n = 2;
      while (used[name.toLowerCase()]) {
        name = base + "-" + n + ".md";
        n += 1;
      }
      used[name.toLowerCase()] = true;
      return name;
    });
  }

  function formatUnix(ts) {
    if (ts == null || ts === "") return "";
    var n = typeof ts === "number" ? ts : Date.parse(ts);
    if (typeof ts === "number" && ts < 1e12) n = ts * 1000;
    if (typeof n !== "number" || !isFinite(n)) {
      var parsed = Date.parse(String(ts));
      if (!isFinite(parsed)) return "";
      n = parsed;
    }
    var d = new Date(n);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
  }

  function flattenText(text) {
    if (text == null) return "";
    if (typeof text === "string") return text;
    if (typeof text === "number" || typeof text === "boolean") return String(text);
    if (Array.isArray(text)) {
      return text.map(function (part) {
        if (part == null) return "";
        if (typeof part === "string") return part;
        if (typeof part === "number" || typeof part === "boolean") return String(part);
        if (typeof part === "object" && typeof part.text === "string") return part.text;
        return "";
      }).join("");
    }
    if (typeof text === "object" && typeof text.text === "string") return text.text;
    return "";
  }

  function messageText(msg) {
    if (!msg) return "";
    var fromText = flattenText(msg.text);
    if (fromText) return fromText;
    if (Array.isArray(msg.text_entities)) return flattenText(msg.text_entities);
    return "";
  }

  function looksLikeChat(obj) {
    return obj && typeof obj === "object" && Array.isArray(obj.messages);
  }

  function looksLikeAccount(obj) {
    return obj && typeof obj === "object" && obj.chats && Array.isArray(obj.chats.list);
  }

  function chatFromObject(raw, idx) {
    if (!looksLikeChat(raw)) {
      throw new ExportError(NEED_EXPORT);
    }
    var title = raw.name || raw.title || "Untitled";
    var messages = raw.messages.map(function (m) {
      return {
        from: (m && m.from) || (m && m.actor) || "",
        date: m && (m.date || m.date_unixtime),
        type: m && m.type,
        text: messageText(m)
      };
    });
    return {
      id: raw.id != null ? raw.id : idx,
      title: title,
      type: raw.type || "",
      source: "Telegram",
      messages: messages
    };
  }

  function chatsFromData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new ExportError(NEED_EXPORT);
    }
    var list;
    if (looksLikeAccount(data)) {
      list = data.chats.list;
    } else if (looksLikeChat(data)) {
      list = [data];
    } else {
      throw new ExportError(NEED_EXPORT);
    }
    if (list.length > MAX_CHATS) {
      throw new ExportError("Export has too many chats (max " + MAX_CHATS + ").");
    }
    return list.map(function (raw, idx) {
      if (!raw || typeof raw !== "object") {
        throw new ExportError("Chat " + (idx + 1) + " is not an object.");
      }
      return chatFromObject(raw, idx);
    });
  }

  function toMarkdown(chat) {
    var lines = [];
    lines.push("# " + (chat.title || "Untitled"));
    if (chat.type) lines.push("", "_Type: " + chat.type + "_");
    if (chat.source) lines.push("", "_Source: " + chat.source + "_");
    lines.push("");
    chat.messages.forEach(function (msg) {
      var body = String(msg.text || "").trim();
      if (!body) return;
      var who = msg.from || "Message";
      var ts = formatUnix(msg.date);
      lines.push("## " + who + (ts ? " · " + ts : ""));
      lines.push("");
      lines.push(body);
      lines.push("");
    });
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function parseJsonBytes(text, label) {
    if (text.length > MAX_JSON_BYTES) {
      throw new ExportError(label + " is too large (max 50 MB).");
    }
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new ExportError(label + " is not valid JSON.");
    }
    return chatsFromData(data);
  }

  async function parseZip(file) {
    if (file.size > MAX_ZIP_BYTES) {
      throw new ExportError("ZIP is too large (max 50 MB).");
    }
    if (typeof JSZip === "undefined") {
      throw new ExportError("JSZip failed to load. Check your network and try again.");
    }
    var payload = file;
    if (file && typeof file.arrayBuffer === "function") {
      payload = await file.arrayBuffer();
    }
    var zip;
    try {
      zip = await JSZip.loadAsync(payload);
    } catch (err) {
      throw new ExportError("Could not read that ZIP. Telegram Desktop export ZIP required.");
    }
    var names = Object.keys(zip.files);
    if (names.length > MAX_ENTRIES) {
      throw new ExportError("ZIP has too many files (max " + MAX_ENTRIES + ").");
    }
    var resultNames = names.filter(function (n) {
      return !zip.files[n].dir && isResultJson(n);
    });
    if (resultNames.length === 0) {
      throw new ExportError("No result.json found. Telegram Desktop export ZIP required.");
    }
    var all = [];
    for (var i = 0; i < resultNames.length; i++) {
      var entry = zip.files[resultNames[i]];
      var text = await entry.async("string");
      var chats = parseJsonBytes(text, basename(resultNames[i]));
      all = all.concat(chats);
    }
    if (all.length > MAX_CHATS) {
      throw new ExportError("Export has too many chats (max " + MAX_CHATS + ").");
    }
    return all;
  }

  async function parseFile(file) {
    if (!file) throw new ExportError("No file selected.");
    var name = (file.name || "").toLowerCase();
    if (name.endsWith(".zip")) return parseZip(file);
    if (name.endsWith(".json") || basename(name) === "result.json") {
      if (file.size > MAX_JSON_BYTES) {
        throw new ExportError("result.json is too large (max 50 MB).");
      }
      var text = await file.text();
      return parseJsonBytes(text, file.name || "result.json");
    }
    throw new ExportError("Drop a Telegram Desktop export ZIP or result.json (Settings → Advanced → Export Telegram data).");
  }

  root.TgMD = {
    ExportError: ExportError,
    MAX_ZIP_BYTES: MAX_ZIP_BYTES,
    sanitiseFilename: sanitiseFilename,
    uniqueFilenames: uniqueFilenames,
    formatUnix: formatUnix,
    flattenText: flattenText,
    chatsFromData: chatsFromData,
    parseZip: parseZip,
    parseFile: parseFile,
    toMarkdown: toMarkdown,
    isResultJson: isResultJson
  };
})(typeof window !== "undefined" ? window : globalThis);
