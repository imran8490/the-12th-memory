
function safeValue(value, fallback) {
  if (value === undefined || value === null || value === "" || value === "undefined") {
    return fallback;
  }
  return value;
}

function getMemoryFan(memory) {
  return safeValue(memory.name || memory.userName || memory.fan || memory.owner || memory.ownerName, "World Cup Fan");
}

function getMemoryMood(memory) {
  return safeValue(memory.mood || memory.fanMood  ||memory.predictionType, "Confident");
}

function getMemoryStatus(memory) {
  return safeValue(memory.status || memory.survival  ||memory.survivalStatus, "Active Prediction");
}

function getMemoryTeam(memory) {
  return safeValue(memory.team || memory.latestTeam, "World Cup Team");
}

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
const survivalMeter = document.getElementById("survivalMeter");
const survivalInfo = document.getElementById("survivalInfo");
const memoryProof = document.getElementById("memoryProof");

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const promptButtons = document.querySelectorAll(".prompt-btn");

const matchContextList = document.getElementById("matchContextList");
const scheduleList = document.getElementById("scheduleList");
const tabs = document.querySelectorAll(".tab");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    const targetId = tab.getAttribute("data-target");
    const target = document.getElementById(targetId);

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
});

if (confidenceInput && confidenceValue) {
  confidenceInput.addEventListener("input", () => {
    confidenceValue.textContent = confidenceInput.value;
  });
}

promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chatInput.value = button.textContent.trim();
    chatInput.focus();

    const chatSection = document.getElementById("chatSection");
    if (chatSection) {
      chatSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

  if (!payload.name) {
    alert("Name required nanba");
    return;
  }

  if (!payload.prediction) {
    alert("Prediction required nanba");
    return;
  }

  try {
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    const res = await fetch("/api/save-memory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "Something went wrong");
      return;
    }

    predictionInput.value = "";

    addBotMessage(
      `Memory saved. I will remember that ${payload.name} backed ${payload.team} with ${payload.confidence}% confidence. Proof: ${data.memory.walrusProof}`
    );

    await loadMemories();

    const chatSection = document.getElementById("chatSection");
    if (chatSection) {
      chatSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
  if (event.key === "Enter") {
    sendChatMessage();
  }
});

agentBtn.addEventListener("click", async () => {
  try {
    agentBtn.textContent = "Checking...";
    agentBtn.disabled = true;

    const res = await fetch("/api/agent-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        team: askTeam.value
      })
    });

    const data = await res.json();
    agentReply.textContent = data.reply;
  } catch (error) {
    console.error(error);
    agentReply.textContent = "Loyalty check ready. Your score is based on saved prediction consistency.";
  } finally {
    agentBtn.textContent = "Check Loyalty";
    agentBtn.disabled = false;
  }
});

refreshBtn.addEventListener("click", () => {
  loadMemories();
  loadMatchContext();
  loadSchedule();
});

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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await res.json();

    if (data.success) {
      addBotMessage(data.reply);
    } else {
      addBotMessage("Something went wrong while thinking.");
    }
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
    const res = await fetch("/api/memories");
    const data = await res.json();

    if (!data.memories || data.memories.length === 0) {
      memoryList.innerHTML = `
        <div class="empty">
          No fan memory yet. Save your first World Cup prediction.
        </div>
      `;

      loyaltyScore.textContent = "--";
      memoryScore.textContent = "0";
      latestTeam.textContent = "--";
      survivalMeter.textContent = "--";
      survivalMeter.className = "";
      survivalInfo.textContent = "Save a prediction to calculate status";
      memoryProof.textContent = "--";
      return;
    }

    renderMemories(data.memories);
    calculateStats(data.memories);
  } catch (error) {
    console.error(error);

    memoryList.innerHTML = `
      <div class="empty">
        No saved memories yet. Save a prediction to create your first Walrus Memory proof.
      </div>
    `;
  }
}

function renderMemories(memories) {
  memoryList.innerHTML = memories
    .map((memory, index) => {
      const date = new Date(memory.createdAt).toLocaleString();
      const tag = index === 0 ? "Latest Memory" : `Memory #${memories.length - index}`;

      return `
        <div class="memory-item">
          <div class="memory-topline">
            <div class="memory-team">${escapeHTML(getMemoryTeam(memory))} · ${escapeHTML(memory.predictionType)}</div>
            <div class="survival ${escapeHTML(memory.survivalClass)}">
              ${escapeHTML(memory.survivalEmoji)} ${escapeHTML(memory.survivalStatus)}
            </div>
          </div>

          <div class="memory-date">${tag} · ${date}</div>

          <div class="memory-prediction">
            ${escapeHTML(memory.prediction)}
          </div>

          <div class="memory-meta">
            Fan: ${escapeHTML(getMemoryFan(memory))} · 
            Confidence: ${escapeHTML(memory.confidence)}% · 
            Mood: ${escapeHTML(getMemoryMood(memory))}
          </div>

          <div class="memory-meta">
            ${escapeHTML(memory.walrusStatus || "Demo mode")} · Proof: ${escapeHTML(memory.walrusProof || "--")}
          </div>
        </div>
      `;
    })
    .join("");
}

function calculateStats(memories) {
  const firstTeam = memories[memories.length - 1].team;
  const sameTeamCount = memories.filter((memory) => memory.team === firstTeam).length;

  let score = Math.round((sameTeamCount / memories.length) * 100);

  if (memories.length === 1) {
    score = Number(memories[0].confidence);
  }

  const latest = memories[0];

  loyaltyScore.textContent = `${score}%`;
  memoryScore.textContent = `${memories.length}`;
  latestTeam.textContent = latest.team;

  survivalMeter.textContent = `${latest.survivalEmoji} ${latest.survivalStatus}`;
  survivalMeter.className = latest.survivalClass || "";
  survivalInfo.textContent = `Latest prediction team: ${latest.team}`;

  memoryProof.textContent = latest.walrusProof || "--";
}

async function loadMatchContext() {
  try {
    const res = await fetch("/api/match-context");
    const data = await res.json();

    if (!data.matches || data.matches.length === 0) {
      matchContextList.innerHTML = `<div class="no-match">No match context available</div>`;
      return;
    }

    matchContextList.innerHTML = data.matches
      .map((match) => {
        return `
          <div class="match-item">
            <div class="match-main">
              <span>${escapeHTML(match.homeTeam)} vs ${escapeHTML(match.awayTeam)}</span>
              <span class="match-score">${escapeHTML(match.homeScore)} - ${escapeHTML(match.awayScore)}</span>
            </div>
            <div class="match-meta">
              <span class="context-tag">DEMO CONTEXT</span>
              ${escapeHTML(match.minute)} · ${escapeHTML(match.stadium)}<br>
              ${escapeHTML(match.context)}
            </div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error(error);
    matchContextList.innerHTML = `<div class="no-match">Match context ready</div>`;
  }
}

async function loadSchedule() {
  try {
    const res = await fetch("/api/schedule");
    const data = await res.json();

    if (!data.matches || data.matches.length === 0) {
      scheduleList.innerHTML = `<div class="no-match">No upcoming matches</div>`;
      return;
    }

    scheduleList.innerHTML = data.matches
      .map((match) => {
        return `
          <div class="match-item">
            <div class="match-main">
              <span>${escapeHTML(match.homeTeam)} vs ${escapeHTML(match.awayTeam)}</span>
            </div>
            <div class="match-meta">
              ${escapeHTML(match.date)} · ${escapeHTML(match.time)}<br>
              ${escapeHTML(match.stadium)}
            </div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error(error);
    scheduleList.innerHTML = `<div class="no-match">World Cup 2026 schedule ready</div>`;
  }
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  loadMemories();
  loadMatchContext();
  loadSchedule();
});
