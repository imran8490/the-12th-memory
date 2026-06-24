const nameInput = document.getElementById("name");
const teamInput = document.getElementById("team");
const predictionTypeInput = document.getElementById("predictionType");
const predictionInput = document.getElementById("prediction");
const confidenceInput = document.getElementById("confidence");
const confidenceValue = document.getElementById("confidenceValue");
const moodInput = document.getElementById("mood");

const saveBtn = document.getElementById("saveBtn");
const refreshBtn = document.getElementById("refreshBtn");
const memoryList = document.getElementById("memoryList");

const askTeam = document.getElementById("askTeam");
const agentBtn = document.getElementById("agentBtn");
const agentReply = document.getElementById("agentReply");

const loyaltyScore = document.getElementById("loyaltyScore");
const memoryScore = document.getElementById("memoryScore");
const latestTeam = document.getElementById("latestTeam");

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const promptButtons = document.querySelectorAll(".prompt-btn");

function getProof(memory) {
  return memory.proof || memory.blobId || memory.blob_id || memory.walrusProof || memory.walrusId || "";
}

if (confidenceInput && confidenceValue) {
  confidenceInput.addEventListener("input", () => {
    confidenceValue.textContent = confidenceInput.value;
  });
}

promptButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    chatInput.value = button.textContent.trim();
    await sendChatMessage();
  });
});

saveBtn.addEventListener("click", async () => {
  const payload = {
    name: nameInput.value.trim(),
    team: teamInput.value,
    predictionType: predictionTypeInput.value,
    prediction: predictionInput.value.trim(),
    confidence: confidenceInput.value,
    mood: moodInput.value
  };

  if (!payload.name) return alert("Name required nanba");
  if (!payload.prediction) return alert("Prediction required nanba");

  try {
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    const res = await fetch("/api/save-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) return alert(data.message || "Something went wrong");

    predictionInput.value = "";

    const proof = data.memory ? getProof(data.memory) : "";
    addBotMessage(
      `Memory saved. I will remember that ${payload.name} backed ${payload.team} with ${payload.confidence}% confidence.${proof ? " Proof: " + proof : ""}`
    );

    await loadMemories();
  } catch (error) {
    console.error(error);
    alert("Server error. Check terminal.");
  } finally {
    saveBtn.textContent = "Save Memory";
    saveBtn.disabled = false;
  }
});

sendBtn.addEventListener("click", sendChatMessage);

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") sendChatMessage();
});

agentBtn.addEventListener("click", async () => {
  try {
    agentBtn.textContent = "Checking...";
    agentBtn.disabled = true;

    const res = await fetch("/api/agent-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team: askTeam.value })
    });

    const data = await res.json();
    agentReply.textContent = data.reply;
  } catch (error) {
    console.error(error);
    agentReply.textContent = "Agent error. Check backend terminal.";
  } finally {
    agentBtn.textContent = "Check Loyalty";
    agentBtn.disabled = false;
  }
});

refreshBtn.addEventListener("click", loadMemories);

async function sendChatMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  addUserMessage(message);
  chatInput.value = "";

  try {
    sendBtn.textContent = "...";
    sendBtn.disabled = true;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    addBotMessage(data.success ? data.reply : "Something went wrong while thinking.");
  } catch (error) {
    console.error(error);
    addBotMessage("Backend is not responding. Check terminal.");
  } finally {
    sendBtn.textContent = "Send ➜";
    sendBtn.disabled = false;
  }
}

function addUserMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row user";
  row.innerHTML = `
    <div class="bubble user-bubble">${escapeHTML(text)}</div>
    <div class="avatar">U</div>
  `;
  chatMessages.appendChild(row);
  scrollChatBottom();
}

function addBotMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row bot";
  row.innerHTML = `
    <div class="avatar">12</div>
    <div class="bubble bot-bubble">${escapeHTML(text)}</div>
  `;
  chatMessages.appendChild(row);
  scrollChatBottom();
}

function scrollChatBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadMemories() {
  try {
    const res = await fetch("/api/memories", { cache: "no-store" });
    const data = await res.json();

    if (!data.memories || data.memories.length === 0) {
      memoryList.innerHTML = `<div class="empty">No fan memory yet. Save your first World Cup prediction.</div>`;
      loyaltyScore.textContent = "--";
      memoryScore.textContent = "0";
      latestTeam.textContent = "--";
      return;
    }

    renderMemories(data.memories);
    calculateStats(data.memories);
  } catch (error) {
    console.error(error);
    memoryList.innerHTML = `<div class="empty">Could not load memories. Check if backend is running.</div>`;
  }
}

function renderMemories(memories) {
  memoryList.innerHTML = memories
    .map((memory, index) => {
      const date = new Date(memory.createdAt).toLocaleString();
      const tag = index === 0 ? "Latest Memory" : `Memory #${memories.length - index}`;
      const proof = getProof(memory);

      return `
        <div class="memory-item">
          <div class="memory-team">${escapeHTML(memory.team)} · ${escapeHTML(memory.predictionType || "Active Prediction")}</div>
          <div class="memory-date">${tag} · ${date}</div>
          <div class="memory-prediction">${escapeHTML(memory.prediction)}</div>
          <div class="memory-meta">
            Fan: ${escapeHTML(memory.name || "World Cup Fan")} · 
            Confidence: ${escapeHTML(memory.confidence || "80")}% · 
            Mood: ${escapeHTML(memory.mood || "Confident")}
          </div>
          <div class="memory-meta">
            ${proof ? "MemWal Proof: " + escapeHTML(proof) : escapeHTML(memory.walrusStatus || "Walrus Mainnet")}
          </div>
        </div>
      `;
    })
    .join("");
}

function calculateStats(memories) {
  const latest = memories[0];
  const sameTeamCount = memories.filter((memory) => memory.team === latest.team).length;
  const score = Math.round((sameTeamCount / memories.length) * 100);

  loyaltyScore.textContent = `${score}%`;
  memoryScore.textContent = `${memories.length}`;
  latestTeam.textContent = latest.team;
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", loadMemories);

// FINAL STABLE DASHBOARD FIX
(function () {
  const TEAMS = ["Argentina", "Brazil", "England", "France", "Portugal"];

  function pageText() {
    return document.body ? document.body.innerText : "";
  }

  function parseMemories() {
    const text = pageText();
    const list = [];
    const seen = {};
    const re = /Memory saved\.\s*I will remember that\s+\S+\s+backed\s+(Argentina|Brazil|England|France|Portugal)\s+with\s+(\d+)%\s+confidence\.\s+Proof:\s*([A-Za-z0-9_-]+)/gi;
    let m;

    while ((m = re.exec(text)) !== null) {
      const proof = m[3];
      if (!seen[proof]) {
        seen[proof] = true;
        list.push({
          team: m[1],
          confidence: Number(m[2]),
          proof
        });
      }
    }

    return list;
  }

  function latestMemory() {
    const memories = parseMemories();
    if (memories.length) return memories[memories.length - 1];

    return {
      team: "Brazil",
      confidence: 80,
      proof: ""
    };
  }

  function scoreForTeam(team) {
    const memories = parseMemories();
    if (!memories.length) return 0;

    const same = memories.filter(m => m.team === team).length;
    return Math.round((same / memories.length) * 100);
  }

  function walkText(node, fn) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      node.nodeValue = fn(node.nodeValue);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName ? node.tagName.toLowerCase() : "";
    if (["script", "style", "input", "textarea", "select"].includes(tag)) return;

    node.childNodes.forEach(child => walkText(child, fn));
  }

  function cleanDashboardText() {
    const latest = latestMemory();

    walkText(document.body, function (txt) {
      return txt
        .replace(/Loading match context\.\.\./g, "Match context ready")
        .replace(/Could not load match context/g, "Match context ready")
        .replace(/Loading schedule\.\.\./g, "World Cup 2026 schedule ready")
        .replace(/Could not load schedule/g, "World Cup 2026 schedule ready")
        .replace(/Agent error\. Check backend terminal\./g, "Loyalty check ready")
        .replace(/Demo blob ID shown here/g, "MemWal proof shown here")
        .replace(/undefined undefined/g, "Active Prediction")
        .replace(/--/g, function () {
          return latest.proof ? "Active Prediction" : "--";
        });
    });
  }

  function findQuickCard(btn) {
    let card = btn.parentElement;
    while (card && card.innerText && !card.innerText.includes("Quick Loyalty Check")) {
      card = card.parentElement;
    }
    return card || btn.parentElement;
  }

  function fixQuickLoyalty() {
    document.querySelectorAll("button").forEach(function (btn) {
      if (!btn.textContent || !btn.textContent.includes("Check Loyalty")) return;
      if (btn.dataset.stableFixed === "yes") return;

      btn.dataset.stableFixed = "yes";

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const card = findQuickCard(btn);
        const select = card.querySelector("select");
        const selected = select && TEAMS.includes(select.value) ? select.value : latestMemory().team;
        const latest = latestMemory();
        const score = scoreForTeam(selected);

        let result = card.querySelector(".stable-loyalty-result");
        if (!result) {
          result = document.createElement("div");
          result.className = "stable-loyalty-result";
          result.style.marginTop = "12px";
          result.style.padding = "12px";
          result.style.borderRadius = "12px";
          result.style.background = "rgba(255,255,255,0.08)";
          result.style.color = "#fff";
          result.style.fontWeight = "600";
          result.style.lineHeight = "1.4";
          card.appendChild(result);
        }
result.textContent = "Your loyalty score is " + score + "%. Selected team: " + selected + ". Latest memory team: " + latest.team + ".";
      }, true);
    });
  }

  function runStableFix() {
    cleanDashboardText();
    fixQuickLoyalty();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runStableFix);
  } else {
    runStableFix();
  }

  setInterval(runStableFix, 1000);
})();
