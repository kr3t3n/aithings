(function () {
  "use strict";
  var drop = document.getElementById("drop");
  var input = document.getElementById("file");
  var errEl = document.getElementById("err");
  var results = document.getElementById("results");
  var listEl = document.getElementById("list");
  var countEl = document.getElementById("count");
  var allBtn = document.getElementById("all");
  var chats = [];
  var files = [];

  function showError(msg) {
    errEl.textContent = msg;
    errEl.classList.remove("hidden");
    results.classList.add("hidden");
    chats = [];
    files = [];
  }
  function clearError() {
    errEl.textContent = "";
    errEl.classList.add("hidden");
  }
  function downloadBlob(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function render() {
    files = ChatMD.uniqueFilenames(chats);
    countEl.textContent = chats.length + (chats.length === 1 ? " chat" : " chats");
    listEl.innerHTML = "";
    chats.forEach(function (chat, i) {
      var li = document.createElement("li");
      li.className = "item";
      var row = document.createElement("div");
      row.className = "row";
      var turns = chat.messages.filter(function (m) {
        var r = m.author && m.author.role;
        return r && r !== "system";
      }).length;
      var name = document.createElement("span");
      name.className = "name";
      name.textContent = chat.title || "Untitled";
      var actions = document.createElement("span");
      actions.className = "actions";
      [["view", "View"], ["copy", "Copy"], ["dl", "Download"]].forEach(function (pair) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("data-act", pair[0]);
        btn.setAttribute("data-i", String(i));
        btn.textContent = pair[1];
        actions.appendChild(btn);
      });
      var meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = (chat.source || "") + " · " + turns + " turns · " + files[i];
      row.appendChild(name);
      row.appendChild(actions);
      row.appendChild(meta);
      var preview = document.createElement("textarea");
      preview.className = "preview hidden";
      preview.readOnly = true;
      preview.setAttribute("aria-label", "Markdown preview");
      li.appendChild(row);
      li.appendChild(preview);
      listEl.appendChild(li);
    });
    results.classList.remove("hidden");
  }
  async function handleFile(file) {
    clearError();
    try {
      chats = await ChatMD.parseFile(file);
      if (!chats.length) {
        showError("No conversations in this export.");
        return;
      }
      render();
    } catch (e) {
      showError(e.message || String(e));
    }
  }

  drop.addEventListener("click", function () { input.click(); });
  drop.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
  });
  input.addEventListener("change", function () {
    if (input.files && input.files[0]) handleFile(input.files[0]);
    input.value = "";
  });
  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
  });
  drop.addEventListener("drop", function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  function hidePreviews(except) {
    listEl.querySelectorAll(".preview").forEach(function (el) {
      if (el !== except) el.classList.add("hidden");
    });
  }
  function previewFor(btn) {
    var item = btn.closest(".item");
    return item ? item.querySelector(".preview") : null;
  }
  function showPreview(btn, md, select) {
    var box = previewFor(btn);
    if (!box) return;
    hidePreviews(box);
    box.value = md;
    box.classList.remove("hidden");
    if (select) {
      box.focus();
      box.select();
    }
  }

  listEl.addEventListener("click", async function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    var i = Number(btn.getAttribute("data-i"));
    var act = btn.getAttribute("data-act");
    var md = ChatMD.toMarkdown(chats[i]);
    if (act === "copy") {
      showPreview(btn, md, false);
      try {
        await navigator.clipboard.writeText(md);
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy"; }, 1200);
      } catch (err) {
        showPreview(btn, md, true);
      }
    } else if (act === "dl") {
      downloadBlob(new Blob([md], { type: "text/markdown;charset=utf-8" }), files[i]);
    } else if (act === "view") {
      var box = previewFor(btn);
      if (box && !box.classList.contains("hidden") && box.value === md) {
        box.classList.add("hidden");
        return;
      }
      showPreview(btn, md, false);
    }
  });

  allBtn.addEventListener("click", async function () {
    if (!chats.length) return;
    var zip = new JSZip();
    chats.forEach(function (chat, i) {
      zip.file(files[i], ChatMD.toMarkdown(chat));
    });
    var blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "chatmd.zip");
  });
})();
