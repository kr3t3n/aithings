/* chatmd — parse official ChatGPT / Claude export ZIPs to markdown */
(function (root) {
  "use strict";

  var MAX_ZIP_BYTES = 50 * 1024 * 1024;
  var MAX_JSON_BYTES = 50 * 1024 * 1024;
  var MAX_ENTRIES = 200;
  var MAX_CHATS = 4000;

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

  function isConversationFile(path) {
    if (isJunkPath(path)) return false;
    var name = basename(path);
    return name === "conversations.json" || /^conversations-\d+\.json$/.test(name);
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

  function partText(part) {
    if (part == null) return "";
    if (typeof part === "string") return part;
    if (typeof part === "number" || typeof part === "boolean") return String(part);
    if (typeof part === "object") {
      if (typeof part.text === "string") return part.text;
      if (typeof part.value === "string") return part.value;
    }
    return "";
  }

  function messageText(msg) {
    if (!msg) return "";
    var content = msg.content;
    if (typeof content === "string") return content;
    if (content && Array.isArray(content.parts)) {
      return content.parts.map(partText).filter(Boolean).join("\n");
    }
    if (Array.isArray(content)) {
      return content.map(partText).filter(Boolean).join("\n");
    }
    if (typeof msg.text === "string") return msg.text;
    return "";
  }

  function roleLabel(role) {
    var r = String(role || "").toLowerCase();
    if (r === "user" || r === "human") return "User";
    if (r === "assistant") return "Assistant";
    if (r === "tool") return "Tool";
    if (r === "system") return "";
    return role ? String(role) : "Message";
  }

  function flattenChatGPT(conv) {
    var mapping = conv.mapping || {};
    var path = [];
    var nodeId = conv.current_node;
    if (!nodeId) {
      var keys = Object.keys(mapping);
      for (var i = 0; i < keys.length; i++) {
        var node = mapping[keys[i]];
        if (node && (!node.children || node.children.length === 0) && node.parent) {
          nodeId = keys[i];
          break;
        }
      }
    }
    var seen = Object.create(null);
    var guard = 0;
    while (nodeId && mapping[nodeId] && !seen[nodeId] && guard < 20000) {
      seen[nodeId] = true;
      guard += 1;
      var entry = mapping[nodeId];
      var msg = entry.message;
      if (msg && msg.author && msg.author.role && msg.author.role !== "system") {
        path.push(msg);
      }
      nodeId = entry.parent;
    }
    path.reverse();
    return path;
  }

  function claudeText(msg) {
    if (!msg) return "";
    if (typeof msg.text === "string" && msg.text) return msg.text;
    if (Array.isArray(msg.content)) {
      return msg.content.map(partText).filter(Boolean).join("\n");
    }
    return messageText(msg);
  }

  function flattenClaude(conv) {
    var list = conv.chat_messages || [];
    return list.map(function (m) {
      return {
        author: { role: m.sender || m.role || "" },
        content: { parts: [claudeText(m)] },
        create_time: m.created_at || m.create_time
      };
    });
  }

  function detectKind(data) {
    if (!Array.isArray(data)) {
      throw new ExportError("This is not a ChatGPT export. ChatGPT export ZIP required.");
    }
    if (data.length === 0) return "empty";
    var sample = null;
    for (var i = 0; i < data.length; i++) {
      if (data[i] && typeof data[i] === "object") {
        sample = data[i];
        break;
      }
    }
    if (!sample) {
      throw new ExportError("This is not a ChatGPT export. ChatGPT export ZIP required.");
    }
    if (sample.mapping && typeof sample.mapping === "object") return "chatgpt";
    if (Array.isArray(sample.chat_messages)) return "claude";
    throw new ExportError("This is not a ChatGPT export. ChatGPT export ZIP required.");
  }

  function toMarkdown(chat) {
    var lines = [];
    lines.push("# " + (chat.title || "Untitled"));
    var created = formatUnix(chat.createTime);
    if (created) lines.push("", "_Created: " + created + "_");
    if (chat.source) lines.push("", "_Source: " + chat.source + "_");
    lines.push("");
    chat.messages.forEach(function (msg) {
      var label = roleLabel(msg.author && msg.author.role);
      if (!label) return;
      var body = messageText(msg).trim();
      if (!body) return;
      var ts = formatUnix(msg.create_time);
      lines.push("## " + label + (ts ? " · " + ts : ""));
      lines.push("");
      lines.push(body);
      lines.push("");
    });
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function chatsFromArray(data) {
    var kind = detectKind(data);
    if (kind === "empty") return [];
    if (data.length > MAX_CHATS) {
      throw new ExportError("Export has too many chats (max " + MAX_CHATS + ").");
    }
    var flatten = kind === "claude" ? flattenClaude : flattenChatGPT;
    var source = kind === "claude" ? "Claude" : "ChatGPT";
    return data.map(function (conv, idx) {
      if (!conv || typeof conv !== "object") {
        throw new ExportError("Conversation " + (idx + 1) + " is not an object.");
      }
      var title = conv.title || conv.name || "Untitled";
      var createTime = conv.create_time || conv.created_at || null;
      return {
        id: conv.conversation_id || conv.id || conv.uuid || String(idx),
        title: title,
        createTime: createTime,
        source: source,
        messages: flatten(conv)
      };
    });
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
    return chatsFromArray(data);
  }

  function parseConversationJson(text) {
    return parseJsonBytes(text, "conversations.json");
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
      throw new ExportError("Could not read that ZIP. ChatGPT export ZIP required.");
    }
    var names = Object.keys(zip.files);
    if (names.length > MAX_ENTRIES) {
      throw new ExportError("ZIP has too many files (max " + MAX_ENTRIES + ").");
    }
    var convoNames = names.filter(function (n) {
      return !zip.files[n].dir && isConversationFile(n);
    });
    if (convoNames.length === 0) {
      throw new ExportError("No conversations.json found. ChatGPT export ZIP required.");
    }
    var all = [];
    for (var i = 0; i < convoNames.length; i++) {
      var entry = zip.files[convoNames[i]];
      var text = await entry.async("string");
      var chats = parseJsonBytes(text, basename(convoNames[i]));
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
    if (name === "conversations.json" || /^conversations-\d+\.json$/.test(basename(name))) {
      if (file.size > MAX_JSON_BYTES) {
        throw new ExportError("conversations.json is too large (max 50 MB).");
      }
      var text = await file.text();
      return parseConversationJson(text);
    }
    throw new ExportError("Drop a ChatGPT export ZIP (Settings → Data controls → Export).");
  }

  root.ChatMD = {
    ExportError: ExportError,
    MAX_ZIP_BYTES: MAX_ZIP_BYTES,
    sanitiseFilename: sanitiseFilename,
    uniqueFilenames: uniqueFilenames,
    formatUnix: formatUnix,
    detectKind: detectKind,
    flattenChatGPT: flattenChatGPT,
    flattenClaude: flattenClaude,
    chatsFromArray: chatsFromArray,
    parseConversationJson: parseConversationJson,
    parseZip: parseZip,
    parseFile: parseFile,
    toMarkdown: toMarkdown,
    isConversationFile: isConversationFile
  };
})(typeof window !== "undefined" ? window : globalThis);
