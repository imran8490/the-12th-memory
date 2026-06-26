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
const memoryTimeline = document.getElementById("memoryTimeline");

const askTeam = document.getElementById("askTeam");
const agentBtn = document.getElementById("agentBtn");
const agentReply = document.getElementById("loyaltyResult");

const loyaltyScore = document.getElementById("loyaltyScore");
const memoryScore = document.getElementById("memoryScore");
const latestTeam = document.getElementById("latestTeam");
const memoryProof = document.getElementById("memoryProof");
const survivalMeter = document.getElementById("survivalMeter");
const survivalInfo = document.getElementById("survivalInfo");

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const promptButtons = document.querySelectorAll(".prompt-btn");

function escapeHTML(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanTeam(value) {
  return String(value || "").trim().toLowerCase();
}

function getProof(memory) {
  return (
    memory.proofUrl ||
    memory.proof ||
    memory.blobId ||
    memory.blob_id ||
    memory.walrusProof ||
    memory.walrusId ||
    ""
  );
}

async function fetchMemories() {
  const res = await fetch("/api/memories", { cache: "no-store" });
  const data = await res.json();

  if (!data.success || !Array.isArray(data.memories)) {
    return [];
  }

  return data.memories;
}

if (confidenceInput && confidenceValue) {
  confidenceInput.addEventListener("input", () => {
    confidenceValue.textContent = confidenceInput.value;
  });
}

promptButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!chatInput) return;
    chatInput.value = button.textContent.trim();
    await sendChatMessage();
  });
});

if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    const payload = {
      name: nameInput ? nameInput.value.trim() : "",
      team: teamInput ? teamInput.value : "",
      predictionType: predictionTypeInput ? predictionTypeInput.value : "",
      prediction: predictionInput ? predictionInput.value.trim() : "",
      confidence: confidenceInput ? confidenceInput.value : "80",
      mood: moodInput ? moodInput.value : "Loyal"
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

      if (!data.success) {
        return alert(data.error || data.message || "Something went wrong");
      }

      if (predictionInput) predictionInput.value = "";

      const savedMemory = data.memory || {};
      const proof = getProof(savedMemory);

      addBotMessage(
        `Memory saved. I will remember that ${payload.name} backed ${payload.team} with ${payload.confidence}% confidence.${proof ? " Proof: " + proof : ""}`
      );

      await loadMemories();
      await loadMemoryTimelineBox();
    } catch (error) {
      console.error(error);
      alert("Server error. Check terminal.");
    } finally {
      saveBtn.textContent = "Save Memory";
      saveBtn.disabled = false;
    }
  });
}

if (sendBtn) {
  sendBtn.addEventListener("click", sendChatMessage);
}

if (chatInput) {
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendChatMessage();
  });
}

if (agentBtn) {
  agentBtn.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      await checkQuickLoyalty();
    },
    true
  );
}

if (refreshBtn) {
  refreshBtn.addEventListener("click", async () => {
    await loadMemories();
    await loadMemoryTimelineBox();
  });
}

async function checkQuickLoyalty() {
  try {
    if (!agentBtn || !askTeam || !agentReply) return;

    agentBtn.textContent = "Checking...";
    agentBtn.disabled = true;

    const selectedTeam = askTeam.value;
    const memories = await fetchMemories();

    if (!memories.length) {
      agentReply.innerHTML = `
        <b>Final Loyalty Score: 0%</b><br>
        Selected team: ${escapeHTML(selectedTeam)}<br>
        Reason: No saved memories found yet.
      `;

      if (loyaltyScore) loyaltyScore.textContent = "0%";
      return;
    }

    const totalMemories = memories.length;
    const latestMemory = memories[0];

    const matchedMemories = memories.filter((memory) => {
      return cleanTeam(memory.team) === cleanTeam(selectedTeam);
    });

    const score = Math.round((matchedMemories.length / totalMemories) * 100);

    agentReply.innerHTML = `
      <b>Final Loyalty Score: ${score}%</b><br>
      Selected team: ${escapeHTML(selectedTeam)}<br>
      Latest memory team: ${escapeHTML(latestMemory.team)}<br>
      Saved memories for this team: ${matchedMemories.length}/${totalMemories}<br>
      Reason: Score is based on real saved memory count.
    `;

    if (loyaltyScore) loyaltyScore.textContent = `${score}%`;
    if (latestTeam) latestTeam.textContent = latestMemory.team || "--";
  } catch (error) {
    console.error(error);
    if (agentReply) agentReply.textContent = "Loyalty check failed. Check backend terminal.";
  } finally {
    if (agentBtn) {
      agentBtn.textContent = "Check Loyalty";
      agentBtn.disabled = false;
    }
  }
}

async function sendChatMessage() {
  if (!chatInput || !sendBtn) return;

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
      body: JSON.stringify({
        message,
        currentTeam: teamInput ? teamInput.value : "",
        currentPrediction: predictionInput ? predictionInput.value.trim() : "",
        currentMood: moodInput ? moodInput.value : "",
        currentConfidence: confidenceInput ? confidenceInput.value : ""
      })
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
  if (!chatMessages) return;

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
  if (!chatMessages) return;

  const row = document.createElement("div");
  row.className = "message-row bot";
  row.innerHTML = `
    <div class="avatar">12</div>
    <div class="bubble bot-bubble">${escapeHTML(text).replaceAll("\n", "<br>")}</div>
  `;

  chatMessages.appendChild(row);
  scrollChatBottom();
}

function scrollChatBottom() {
  if (!chatMessages) return;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadMemories() {
  try {
    const memories = await fetchMemories();

    if (!memories.length) {
      if (memoryList) {
        memoryList.innerHTML = `<div class="empty">No fan memory yet. Save your first World Cup prediction.</div>`;
      }

      if (loyaltyScore) loyaltyScore.textContent = "--";
      if (memoryScore) memoryScore.textContent = "0";
      if (latestTeam) latestTeam.textContent = "--";
      if (memoryProof) memoryProof.textContent = "--";
      if (survivalMeter) survivalMeter.textContent = "--";
      if (survivalInfo) survivalInfo.textContent = "Save a prediction to calculate status";
      return;
    }

    renderMemories(memories);
    calculateStats(memories);
  } catch (error) {
    console.error(error);

    if (memoryList) {
      memoryList.innerHTML = `<div class="empty">Could not load memories. Check if backend is running.</div>`;
    }
  }
}

function renderMemories(memories) {
  if (!memoryList) return;

  memoryList.innerHTML = memories
    .map((memory, index) => {
      const date = memory.createdAt
        ? new Date(memory.createdAt).toLocaleString()
        : "Unknown date";

      const tag = index === 0 ? "Latest Memory" : `Memory #${memories.length - index}`;
      const proof = getProof(memory);

      return `
        <div class="memory-item">
          <div class="memory-team">
            ${escapeHTML(memory.team || "--")} · ${escapeHTML(memory.predictionType || "Active Prediction")}
          </div>

          <div class="memory-date">${escapeHTML(tag)} · ${escapeHTML(date)}</div>

          <div class="memory-prediction">${escapeHTML(memory.prediction || "--")}</div>

          <div class="memory-meta">
            Fan: ${escapeHTML(memory.name || "World Cup Fan")} ·
            Confidence: ${escapeHTML(memory.confidence || "80")}% ·
            Mood: ${escapeHTML(memory.mood || "Confident")}
          </div>

          <div class="memory-meta">
            ${
              proof
                ? `MemWal Proof: <a href="${escapeHTML(proof)}" target="_blank">${escapeHTML(proof)}</a>`
                : escapeHTML(memory.storage || memory.walrusStatus || "Walrus Mainnet")
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function calculateStats(memories) {
  const latest = memories[0];
  const proof = getProof(latest);

  const totalMemories = memories.length;
  const latestTeamCount = memories.filter((memory) => {
    return cleanTeam(memory.team) === cleanTeam(latest.team);
  }).length;

  const realScore = Math.round((latestTeamCount / totalMemories) * 100);

  if (loyaltyScore) loyaltyScore.textContent = `${realScore}%`;
  if (memoryScore) memoryScore.textContent = `${totalMemories}`;
  if (latestTeam) latestTeam.textContent = latest.team || "--";

  if (memoryProof) {
    memoryProof.textContent = proof ? proof.slice(0, 18) + "..." : "--";
  }

  if (survivalMeter) {
    survivalMeter.textContent = latest.confidence ? `${latest.confidence}%` : "80%";
  }

  if (survivalInfo) {
    survivalInfo.textContent = `${latest.team || "Your team"} prediction is still active`;
  }
}

async function loadMemoryTimelineBox() {
  if (!memoryTimeline) return;

  try {
    const memories = await fetchMemories();

    if (!memories.length) {
      memoryTimeline.innerHTML = "<p>No memories saved yet.</p>";
      return;
    }

    memoryTimeline.innerHTML = memories
      .map((memory) => {
        const proof = getProof(memory);

        return `
          <div class="memory-card">
            <h3>✅ Memory Saved on Walrus</h3>
            <p><b>Team:</b> ${escapeHTML(memory.team || "--")}</p>
            <p><b>Prediction:</b> ${escapeHTML(memory.prediction || "--")}</p>
            <p><b>Confidence:</b> ${escapeHTML(memory.confidence || "--")}%</p>
            <p><b>Storage:</b> ${escapeHTML(memory.storage || "Walrus Mainnet")}</p>
            <p><b>Blob ID:</b> ${escapeHTML(memory.blobId || "--")}</p>
            ${
              proof
                ? `<a href="${escapeHTML(proof)}" target="_blank">View Walrus Proof</a>`
                : ""
            }
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error(error);
    memoryTimeline.innerHTML = "<p>Failed to load memories.</p>";
  }
}

window.loadMemories = loadMemories;
window.loadMemoryTimeline = loadMemoryTimelineBox;
window.checkQuickLoyalty = checkQuickLoyalty;

document.addEventListener("DOMContentLoaded", async () => {
  await loadMemories();
  await loadMemoryTimelineBox();
});
// FINAL FIX: Load WorldCup API data into Match Context + Schedule cards
(function () {
  function wcEscape(text) {
    return String(text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadWorldCupPanels() {
    const matchBox = document.getElementById("matchContextList");
    const scheduleBox = document.getElementById("scheduleList");

    try {
      if (matchBox) {
        matchBox.innerHTML = "Loading match context...";

        const res = await fetch("/api/match-context", { cache: "no-store" });
        const data = await res.json();

        const matches = Array.isArray(data.matches) ? data.matches : [];

        matchBox.innerHTML = matches.length
          ? matches.map((item) => `<div class="match-item">${wcEscape(item)}</div>`).join("")
          : `<div class="match-item">World Cup 2026 match context ready.</div>`;
      }

      if (scheduleBox) {
        scheduleBox.innerHTML = "Loading schedule...";

        const res = await fetch("/api/schedule", { cache: "no-store" });
        const data = await res.json();

        const schedule = Array.isArray(data.schedule) ? data.schedule : [];

        scheduleBox.innerHTML = schedule.length
          ? schedule.map((item) => `<div class="match-item">${wcEscape(item)}</div>`).join("")
          : `<div class="match-item">World Cup 2026 schedule ready.</div>`;
      }
    } catch (err) {
      console.error("WorldCup panel load failed:", err);

      if (matchBox) {
        matchBox.innerHTML = `<div class="match-item">Match context ready. API fallback active.</div>`;
      }

      if (scheduleBox) {
        scheduleBox.innerHTML = `<div class="match-item">Schedule ready. API fallback active.</div>`;
      }
    }
  }

  window.loadWorldCupPanels = loadWorldCupPanels;

  document.addEventListener("DOMContentLoaded", loadWorldCupPanels);

  setTimeout(loadWorldCupPanels, 500);
})();
