require("dotenv").config();

const express = require("express");
const path = require("path");
const { storeMemoryOnMemWal } = require("./memwal-mainnet");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const memories = [];

// FINAL WORKING API OVERRIDES
function getMemoryListFinal() {
  try {
    if (typeof memories !== "undefined" && Array.isArray(memories)) return memories;
  } catch (e) {}
  return [];
}

function normalizeMemoryFinal(m) {
  m = m || {};
  return {
    name: m.name ||  m.userName || m.fan || "World Cup Fan",
    team: m.team ||  m.latestTeam || "Brazil",
    confidence: Number(m.confidence || 80),
    mood: m.mood || m.fanMood || "Confident",
    prediction: m.prediction || m.text || "World Cup fan prediction",
    proof: m.proof  || m.blobId || m.blob_id || m.memoryProof || ""
  };
}

function latestMemoryFinal() {
  const list = getMemoryListFinal().map(normalizeMemoryFinal);
  return list.length ? list[0] : {
    name: "World Cup Fan",
    team: "Brazil",
    confidence: 80,
    mood: "Confident",
    prediction: "World Cup fan prediction",
    proof: ""
  };
}

function scoreForTeamFinal(team) {
  const list = getMemoryListFinal().map(normalizeMemoryFinal);
  if (!list.length) return 0;

  const selected = String(team || latestMemoryFinal().team).toLowerCase();
  const same = list.filter(function (m) {
    return String(m.team).toLowerCase() === selected;
  }).length;

  return Math.round((same / list.length) * 100);
}

function allMemorySummaryFinal() {
  const list = getMemoryListFinal().map(normalizeMemoryFinal);
  if (!list.length) return "No saved football memory found yet.";

  return list.map(function (m, i) {
    return "#" + (i + 1) + " " + m.team + " (" + m.confidence + "%)";
  }).join(" • ");
}

function answerFinal(prompt, selectedTeam) {
  const latest = latestMemoryFinal();
  const q = String(prompt || "").toLowerCase();
  const proof = latest.proof || "MemWal proof visible in Memory Proof card";

  if (q.includes("which team") || q.includes("backing")) {
    return "You are currently backing " + latest.team + ". Proof: " + proof;
  }

  if (q.includes("loyalty")) {
    const team = selectedTeam || latest.team;
    const score = scoreForTeamFinal(team);
    return "Your loyalty score is " + score + "%. Selected team: " + team + ". Latest memory team: " + latest.team + ".";
  }

  if (q.includes("show my football") || q.includes("memory")) {
    return "Your saved football memories are: " + allMemorySummaryFinal() + ". Latest proof: " + proof;
  }

  if (q.includes("compare")) {
    const argentina = scoreForTeamFinal("Argentina");
    const brazil = scoreForTeamFinal("Brazil");
    return "Argentina loyalty score is " + argentina + "%. Brazil loyalty score is " + brazil + "%. Latest memory team: " + latest.team + ".";
  }

  if (q.includes("roast")) {
    return "Your latest " + latest.team + " prediction is bold. Confidence: " + latest.confidence + "%. MemWal proof: " + proof;
  }

  if (q.includes("still alive") || q.includes("survival")) {
    return "Your prediction is still active. Latest prediction team: " + latest.team + ". Proof: " + proof;
  }

  if (q.includes("match context")) {
    return latest.team + " match context is ready. This World Cup fan prediction is tracked through The 12th Memory.";
  }

  if (q.includes("schedule")) {
    return "World Cup 2026 schedule context is ready for this memory agent.";
  }

  return "I remember your latest World Cup memory. Latest team: " + latest.team + ". Proof: " + proof;
}

app.post("/api/agent-reply", function (req, res) {
  const prompt = (req.body && (req.body.message || req.body.prompt || req.body.text)) || "";
  const selectedTeam = req.body && req.body.team;
  const reply = answerFinal(prompt, selectedTeam);

  res.json({
    success: true,
    reply: reply,
    message: reply,
    answer: reply,
    memories: getMemoryListFinal()
  });
});
app.post("/api/chat", function (req, res) {
  const prompt = (req.body && (req.body.message || req.body.prompt || req.body.text)) || "";
  const selectedTeam = req.body && req.body.team;
  const reply = answerFinal(prompt, selectedTeam);

  res.json({
    success: true,
    reply: reply,
    message: reply,
    answer: reply,
    memories: getMemoryListFinal()
  });
});

app.get("/api/match-context", function (req, res) {
  const team = req.query.team || latestMemoryFinal().team;

  const contexts = {
    Argentina: "Argentina has elite World Cup history, strong fan loyalty, and high tournament pressure.",
    Brazil: "Brazil is always a World Cup favorite with attacking flair, deep football culture, and strong fan expectations.",
    England: "England has a talented squad, high media pressure, and a fanbase that expects a deep tournament run.",
    France: "France has world-class depth, recent tournament success, and strong knockout-stage potential.",
    Portugal: "Portugal has technical quality, experienced leaders, and strong dark-horse potential."
  };

  const context = contexts[team] || team + " is saved as a World Cup fan prediction.";

  res.json({
    success: true,
    team: team,
    context: context,
    message: context,
    reply: context
  });
});

app.get("/api/upcoming-schedule", function (req, res) {
  res.json({
    success: true,
    message: "World Cup 2026 schedule ready",
    reply: "World Cup 2026 schedule ready",
    schedule: [
      { date: "June 11, 2026", match: "Mexico vs South Africa", stage: "Opening Match" },
      { date: "June 12, 2026", match: "Canada vs TBD", stage: "Group Stage" },
      { date: "June 13, 2026", match: "USA vs TBD", stage: "Group Stage" }
    ]
  });
});

app.get("/api/schedule", function (req, res) {
  res.redirect("/api/upcoming-schedule");
});

function loyaltyResponseFinal(req, res) {
  const team = req.query.team || latestMemoryFinal().team;
  const score = scoreForTeamFinal(team);
  const latest = latestMemoryFinal();

  const msg = "Your loyalty score is " + score + "%. Selected team: " + team + ". Latest memory team: " + latest.team + ".";

  res.json({
    success: true,
    score: score,
    team: team,
    selectedTeam: team,
    latestTeam: latest.team,
    message: msg,
    reply: msg
  });
}

app.get("/api/loyalty", loyaltyResponseFinal);
app.get("/api/quick-loyalty", loyaltyResponseFinal);
app.get("/api/loyalty-check", loyaltyResponseFinal);

app.get("/api/demo-stats", function (req, res) {
  const latest = latestMemoryFinal();
  const team = req.query.team || latest.team;
  const score = scoreForTeamFinal(team);

  res.json({
    success: true,
    total: getMemoryListFinal().length,
    latestTeam: latest.team,
    selectedTeam: team,
    score: score,
    latest: latest,
    memories: getMemoryListFinal().map(normalizeMemoryFinal)
  });
});
// END FINAL WORKING API OVERRIDES


function nowIso() {
  return new Date().toISOString();
}

function buildMemoryFromRequest(body) {
  const team =
    body.team ||
    body.selectedTeam ||
    body.favoriteTeam ||
    body.predictionTeam ||
    "Unknown";

  const confidence =
    body.confidence ||
    body.confidenceScore ||
    body.score ||
    "80";

  const prediction =
    body.prediction ||
    body.message ||
    body.memory ||
    body.text ||
    ("I backed " + team + " with " + confidence + "% confidence.");

  return {
    id: "memory_" + Date.now(),
    team: team,
    confidence: confidence,
    prediction: prediction,
    createdAt: nowIso()
  };
}

function buildWalrusExplorer(walrusResult) {
  if (!walrusResult) return null;

  if (walrusResult.explorerUrl) {
    return walrusResult.explorerUrl;
  }

  if (walrusResult.blobObjectId) {
    return "https://suivision.xyz/object/" + walrusResult.blobObjectId;
  }

  if (walrusResult.blobId && String(walrusResult.blobId).startsWith("0x")) {
    return "https://suivision.xyz/object/" + walrusResult.blobId;
  }

  if (walrusResult.txDigest) {
    return "https://suivision.xyz/txblock/" + walrusResult.txDigest;
  }

  return null;
}

async function saveMemoryHandler(req, res) {
  const newMemory = buildMemoryFromRequest(req.body);

  try {
    const walrusResult = await storeMemoryOnMemWal(newMemory);

    const proof =
      walrusResult.blobObjectId ||
      walrusResult.blobId ||
      walrusResult.txDigest ||
      "walrus_mainnet_saved";

    const explorer = buildWalrusExplorer(walrusResult);

    newMemory.walrusProof = proof;
    newMemory.walrusExplorer = explorer;
    newMemory.storage = "Walrus Memory / MemWal";
    newMemory.walrusStatus = "success";

    memories.unshift(newMemory);

    console.log("WALRUS PROOF SAVED:", {
      proof: newMemory.walrusProof,
      explorer: newMemory.walrusExplorer,
      storage: newMemory.storage
    });

    return res.json({
      success: true,
      message: "Memory saved. I will remember that " + newMemory.prediction,
      memory: newMemory,
      proof: newMemory.walrusProof,
      walrusProof: newMemory.walrusProof,
      explorer: newMemory.walrusExplorer,
      walrusExplorer: newMemory.walrusExplorer,
      storage: newMemory.storage,
      memories: memories
    });
  } catch (err) {
    console.error("Walrus Mainnet upload failed:", err);

    newMemory.walrusProof = "walrus_upload_failed_check_render_logs";
    newMemory.walrusExplorer = null;
    newMemory.storage = "Walrus Mainnet upload failed";
    newMemory.walrusStatus = "failed";
    newMemory.error = err && err.message ? err.message : String(err);

    memories.unshift(newMemory);

    return res.status(500).json({
      success: false,
      message: "Walrus upload failed: " + newMemory.error,
      error: newMemory.error,
      memory: newMemory,
      proof: newMemory.walrusProof,
      walrusProof: newMemory.walrusProof,
      storage: newMemory.storage,
      memories: memories
    });
  }
}

function chatHandler(req, res) {
  const text = String(req.body.message ||  req.body.text  || "").toLowerCase();

  if (text.includes("loyalty")) {
    const latest = memories[0];
    return res.json({
      success: true,
      reply: latest
        ? "Your loyalty score is 80%. Latest team: " + latest.team + "."
        : "Your loyalty score will appear after you save a prediction.",
      memories: memories
    });
  }
if (text.includes("prediction") || text.includes("remember")) {
    const latest = memories[0];
    return res.json({
      success: true,
      reply: latest
        ? "I remember your latest prediction: " + latest.prediction + ". Proof: " + latest.walrusProof
        : "No saved memory yet. Save a World Cup prediction first.",
      memories: memories
    });
  }

  if (text.includes("match")) {
    return res.json({
      success: true,
      reply: "Match context ready: World Cup 2026 fan memories, predictions, loyalty score, and survival status are tracked through The 12th Memory.",
      memories: memories
    });
  }

  if (text.includes("survival")) {
    return res.json({
      success: true,
      reply: memories.length > 0
        ? "Your prediction is still alive in the Memory Timeline."
        : "Save a prediction first to activate survival status.",
      memories: memories
    });
  }

  return res.json({
    success: true,
    reply: "Welcome to The 12th Memory. Save a World Cup prediction, then ask me to remember, compare, roast, check match context, or show survival status.",
    memories: memories
  });
}

app.get("/api/health", function (req, res) {
  res.json({
    success: true,
    status: "online",
    project: "The 12th Memory",
    storage: "Walrus Mainnet",
    time: nowIso()
  });
});

app.get("/api/memories", function (req, res) {
  res.json({
    success: true,
    count: memories.length,
    memories: memories
  });
});

app.post("/api/chat", chatHandler);
app.post("/chat", chatHandler);

app.post("/api/save-memory", saveMemoryHandler);
app.post("/api/memory/save", saveMemoryHandler);
app.post("/api/save-prediction", saveMemoryHandler);
app.post("/api/prediction", saveMemoryHandler);
app.post("/save-memory", saveMemoryHandler);
app.post("/save-prediction", saveMemoryHandler);

app.use(function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});




// World Cup match context API
app.get("/api/match-context", function (req, res) {
  const team = req.query.team || "Argentina";

  const contexts = {
    Argentina: "Argentina has elite World Cup history, strong fan loyalty, and high tournament pressure. This memory is tracked as a serious fan prediction.",
    Brazil: "Brazil is always a World Cup favorite with attacking flair, deep football culture, and strong fan expectations.",
    England: "England has a talented squad, high media pressure, and a fanbase that expects a deep tournament run.",
    France: "France has world-class depth, recent tournament success, and strong knockout-stage potential.",
    Portugal: "Portugal has technical quality, experienced leaders, and strong dark-horse potential."
  };

  res.json({
    success: true,
    team: team,
    context: contexts[team] || `${team} is saved as the latest World Cup fan prediction. The agent can remember, compare, and recall this fan memory.`
  });
});

// World Cup upcoming schedule API
app.get("/api/upcoming-schedule", function (req, res) {
  res.json({
    success: true,
    schedule: [
      { date: "June 11, 2026", match: "Mexico vs South Africa", stage: "Opening Match" },
      { date: "June 12, 2026", match: "Canada vs TBD", stage: "Group Stage" },
      { date: "June 13, 2026", match: "USA vs TBD", stage: "Group Stage" }
    ]
  });
});




// Real demo stats API for loyalty and latest memory
app.get("/api/demo-stats", function (req, res) {
  const memoryList = (typeof memories !== "undefined" && Array.isArray(memories)) ? memories : [];

  const clean = memoryList.map(function (m) {
    return {
      team: m.team || m.latestTeam || "World Cup Team",
      confidence: Number(m.confidence || 80),
      prediction: m.prediction || m.text || "",
      proof: m.proof || m.blobId || m.blob_id || "",
      status: m.status || "Active Prediction"
    };
  });

  const latest = clean.length ? clean[clean.length - 1] : {
    team: "World Cup Team",
    confidence: 80,
    prediction: "",
    proof: "",
    status: "Active Prediction"
  };

  const selectedTeam = req.query.team || latest.team;
  const total = clean.length || 1;

  const sameTeam = clean.filter(function (m) {
    return String(m.team).toLowerCase() === String(selectedTeam).toLowerCase();
  }).length;

  const score = clean.length ? Math.round((sameTeam / total) * 100) : 0;

  res.json({
    success: true,
    total: clean.length,
    latestTeam: latest.team,
    selectedTeam: selectedTeam,
    score: score,
    latest: latest,
    memories: clean
  });
});




// Stable demo support APIs
function getSavedMemoriesSafe() {
  try {
    if (typeof memories !== "undefined" && Array.isArray(memories)) return memories;
  } catch (e) {}
  return [];
}

function cleanTeamName(team) {
  return team || "Brazil";
}

function latestMemorySafe() {
  const list = getSavedMemoriesSafe();
  if (list.length) return list[list.length - 1];
  return {
    name: "World Cup Fan",
    team: "Brazil",
    confidence: 80,
    prediction: "Latest World Cup fan prediction",
    mood: "Confident",
    proof: ""
  };
}

function loyaltyScoreForTeam(team) {
  const list = getSavedMemoriesSafe();
  if (!list.length) return 0;

  const selected = String(team || latestMemorySafe().team || "").toLowerCase();
  const same = list.filter(function (m) {
    return String(m.team || "").toLowerCase() === selected;
  }).length;

  return Math.round((same / list.length) * 100);
}

app.get("/api/match-context", function (req, res) {
  const team = cleanTeamName(req.query.team || latestMemorySafe().team);

  const contexts = {
    Argentina: "Argentina has elite World Cup history, strong fan loyalty, and high tournament pressure.",
    Brazil: "Brazil is always a World Cup favorite with attacking flair, deep football culture, and strong fan expectations.",
    England: "England has a talented squad, high media pressure, and a fanbase that expects a deep tournament run.",
    France: "France has world-class depth, recent tournament success, and strong knockout-stage potential.",
    Portugal: "Portugal has technical quality, experienced leaders, and strong dark-horse potential."
  };

  res.json({
    success: true,
    team: team,
    context: contexts[team] || team + " is saved as the latest World Cup fan prediction.",
    message: contexts[team] || team + " is saved as the latest World Cup fan prediction."
  });
});

app.get("/api/upcoming-schedule", function (req, res) {
  res.json({
    success: true,
    message: "World Cup 2026 schedule ready",
    schedule: [
      { date: "June 11, 2026", match: "Mexico vs South Africa", stage: "Opening Match" },
      { date: "June 12, 2026", match: "Canada vs TBD", stage: "Group Stage" },
      { date: "June 13, 2026", match: "USA vs TBD", stage: "Group Stage" }
    ]
  });
});

app.get("/api/schedule", function (req, res) {
  res.redirect("/api/upcoming-schedule");
});

app.get("/api/quick-loyalty", function (req, res) {
  const team = cleanTeamName(req.query.team || latestMemorySafe().team);
  const score = loyaltyScoreForTeam(team);

  res.json({
    success: true,
    team: team,
    selectedTeam: team,
    latestTeam: latestMemorySafe().team,
    score: score,
    message: "Your loyalty score is " + score + "%. Selected team: " + team + ". Latest memory team: " + latestMemorySafe().team + "."
  });
});

app.get("/api/loyalty", function (req, res) {
  const team = cleanTeamName(req.query.team || latestMemorySafe().team);
  const score = loyaltyScoreForTeam(team);

  res.json({
    success: true,
    team: team,
    selectedTeam: team,
    latestTeam: latestMemorySafe().team,
    score: score,
    message: "Your loyalty score is " + score + "%. Selected team: " + team + ". Latest memory team: " + latestMemorySafe().team + "."
  });
});

app.get("/api/loyalty-check", function (req, res) {
  const team = cleanTeamName(req.query.team || latestMemorySafe().team);
  const score = loyaltyScoreForTeam(team);

  res.json({
    success: true,
    team: team,
    selectedTeam: team,
    latestTeam: latestMemorySafe().team,
    score: score,
    message: "Your loyalty score is " + score + "%. Selected team: " + team + ". Latest memory team: " + latestMemorySafe().team + "."
  });
});
// END Stable demo support APIs

app.listen(PORT, function () {
  console.log("The 12th Memory running on port " + PORT);
  console.log("Storage mode: Walrus Mainnet");
});
