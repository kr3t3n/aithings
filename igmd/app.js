/* igmd — parse Instagram / Facebook Download-your-information ZIPs to markdown */
(function (root) {
  "use strict";

  var MAX_ZIP_BYTES = 50 * 1024 * 1024;
  var MAX_JSON_BYTES = 50 * 1024 * 1024;
  var MAX_ENTRIES = 200;
  var MAX_CHATS = 4000;
  var NEED_EXPORT = "This is not an Instagram or Facebook export. Meta “Download your information” ZIP (message_*.json) required.";

  function ExportError(message) {
    this.name = "ExportError";
    this.message = message;
  }
  ExportError.prototype = Object.create(Error.prototype);
  ExportError.prototype.constructor = ExportError;

  function basename(path) {
    var parts = String(path).replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || path;
  }

  function dirname(path) {
    var norm = String(path).replace(/\\/g, "/");
    var i = norm.lastIndexOf("/");
    return i === -1 ? "" : norm.slice(0, i);
  }

  function isJunkPath(path) {
    return /(^|\/)__MACOSX(\/|$)/.test(path) || /(^|\/)\.DS_Store$/.test(path);
  }

  function isMessageJson(path) {
    if (isJunkPath(path)) return false;
    return /^message_\d+\.json$/i.test(basename(path));
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
    var n = typeof ts === "number" ? ts : Number(ts);
    if (!isFinite(n)) {
      var parsed = Date.parse(String(ts));
      if (!isFinite(parsed)) return "";
      n = parsed;
    }
    if (n < 1e12) n = n * 1000;
    var d = new Date(n);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
  }

  function latin1Bytes(str) {
    var out = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c > 255) return null;
      out[i] = c;
    }
    return out;
  }

  function countMojibake(str) {
    var n = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 0x80 && c <= 0xff) n += 1;
    }
    return n;
  }

  function fixMojibake(str) {
    if (typeof str !== "string" || !str) return str || "";
    var bytes = latin1Bytes(str);
    if (!bytes) return str;
    var decoded;
    try {
      decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (err) {
      return str;
    }
    if (decoded === str) return str;
    if (countMojibake(decoded) < countMojibake(str)) return decoded;
    return str;
  }

  function sourceFromPath(path) {
    var p = String(path).toLowerCase();
    if (p.indexOf("instagram") !== -1) return "Instagram";
    if (p.indexOf("facebook") !== -1) return "Facebook";
    if (/(^|\/)messages\/(inbox|archived_threads|filtered_threads|message_requests)\//.test(p)) return "Facebook";
    return "Instagram";
  }

  function hasMedia(msg) {
    if (!msg || typeof msg !== "object") return false;
    return !!(
      msg.photos ||
      msg.videos ||
      msg.audio_files ||
      msg.audio ||
      msg.gifs ||
      msg.sticker ||
      msg.stickers ||
      msg.share ||
      msg.files ||
      msg.clips ||
      msg.clip
    );
  }

  function looksLikeThread(obj) {
    return obj && typeof obj === "object" && !Array.isArray(obj) && Array.isArray(obj.messages);
  }

  function titleFromThread(data, folder) {
    var names = [];
    if (Array.isArray(data.participants)) {
      data.participants.forEach(function (p) {
        var n = fixMojibake((p && p.name) || "");
        if (n) names.push(n);
      });
    }
    if (names.length) return names.join(", ");
    if (data.title) return fixMojibake(String(data.title));
    var base = basename(folder);
    return base || "Untitled";
  }

  function normalizeMessage(raw) {
    var content = raw && typeof raw.content === "string" ? fixMojibake(raw.content) : "";
    var media = hasMedia(raw);
    if (!content && media) content = "(media skipped)";
    return {
      sender: fixMojibake((raw && raw.sender_name) || "") || "Message",
      timestamp: raw && raw.timestamp_ms,
      text: content,
      media: media
    };
  }

  function chatsFromThreads(threads) {
    if (threads.length > MAX_CHATS) {
      throw new ExportError("Export has too many chats (max " + MAX_CHATS + ").");
    }
    return threads.map(function (t) {
      var messages = t.messages.slice().sort(function (a, b) {
        var ta = Number(a.timestamp) || 0;
        var tb = Number(b.timestamp) || 0;
        return ta - tb;
      });
      return {
        id: t.folder || t.title,
        title: t.title || "Untitled",
        source: t.source || "Instagram",
        messages: messages
      };
    });
  }

  function parseThreadObject(data, path) {
    if (!looksLikeThread(data)) {
      throw new ExportError(NEED_EXPORT);
    }
    var folder = dirname(path);
    var messages = data.messages.map(normalizeMessage);
    return {
      folder: folder,
      title: titleFromThread(data, folder),
      source: sourceFromPath(path),
      messages: messages
    };
  }

  function toMarkdown(chat) {
    var lines = [];
    lines.push("# " + (chat.title || "Untitled"));
    if (chat.source) lines.push("", "_Source: " + chat.source + "_");
    lines.push("", "_Order: chronological (oldest first)._");
    lines.push("");
    chat.messages.forEach(function (msg) {
      var body = String(msg.text || "").trim();
      if (!body) return;
      var who = msg.sender || "Message";
      var ts = formatUnix(msg.timestamp);
      lines.push("## " + who + (ts ? " · " + ts : ""));
      lines.push("");
      lines.push(body);
      lines.push("");
    });
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function parseJsonBytes(text, label, path) {
    if (text.length > MAX_JSON_BYTES) {
      throw new ExportError(label + " is too large (max 50 MB).");
    }
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new ExportError(label + " is not valid JSON.");
    }
    return parseThreadObject(data, path || label);
  }

  function mergeThreads(list) {
    var byFolder = Object.create(null);
    var order = [];
    list.forEach(function (t) {
      var key = t.folder || t.title;
      if (!byFolder[key]) {
        byFolder[key] = {
          folder: t.folder,
          title: t.title,
          source: t.source,
          messages: []
        };
        order.push(key);
      } else if (t.title && t.title.length > byFolder[key].title.length) {
        byFolder[key].title = t.title;
      }
      byFolder[key].messages = byFolder[key].messages.concat(t.messages);
    });
    return chatsFromThreads(order.map(function (k) { return byFolder[k]; }));
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
      throw new ExportError("Could not read that ZIP. Instagram or Facebook export ZIP required.");
    }
    var names = Object.keys(zip.files);
    if (names.length > MAX_ENTRIES) {
      throw new ExportError("ZIP has too many files (max " + MAX_ENTRIES + ").");
    }
    var msgNames = names.filter(function (n) {
      return !zip.files[n].dir && isMessageJson(n);
    });
    if (msgNames.length === 0) {
      throw new ExportError("No message_*.json found. Instagram or Facebook export ZIP required.");
    }
    var threads = [];
    for (var i = 0; i < msgNames.length; i++) {
      var entry = zip.files[msgNames[i]];
      var text = await entry.async("string");
      threads.push(parseJsonBytes(text, basename(msgNames[i]), msgNames[i]));
    }
    return mergeThreads(threads);
  }

  async function parseFile(file) {
    if (!file) throw new ExportError("No file selected.");
    var name = (file.name || "").toLowerCase();
    if (name.endsWith(".zip")) return parseZip(file);
    if (/^message_\d+\.json$/.test(basename(name))) {
      if (file.size > MAX_JSON_BYTES) {
        throw new ExportError("message JSON is too large (max 50 MB).");
      }
      var text = await file.text();
      return mergeThreads([parseJsonBytes(text, file.name || "message_1.json", file.name || "message_1.json")]);
    }
    throw new ExportError("Drop a Meta “Download your information” ZIP (message_*.json).");
  }

  root.IgMD = {
    ExportError: ExportError,
    MAX_ZIP_BYTES: MAX_ZIP_BYTES,
    sanitiseFilename: sanitiseFilename,
    uniqueFilenames: uniqueFilenames,
    formatUnix: formatUnix,
    fixMojibake: fixMojibake,
    isMessageJson: isMessageJson,
    parseZip: parseZip,
    parseFile: parseFile,
    parseThreadObject: parseThreadObject,
    mergeThreads: mergeThreads,
    toMarkdown: toMarkdown
  };
})(typeof window !== "undefined" ? window : globalThis);
