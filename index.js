require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 10000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MEMORY_INDEX_FILE = path.join(__dirname, "memory-index.json");
const ROAST_INDEX_FILE = path.join(__dirname, "roast-index.json");

const MEMWAL_NAMESPACE = process.env.MEMWAL_NAMESPACE || "the-12th-memory";
const MEMWAL_SERVER_URL =
  process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz";

const WALRUS_AGGREGATOR_URL =
  process.env.WALRUS_AGGREGATOR_URL ||
  "https://aggregator.walrus-mainnet.walrus.space/v1/blobs";

let memwalClient = null;

/* ---------------- ENV CHECK ---------------- */

function checkEnv() {
  const key = process.env.MEMWAL_PRIVATE_KEY || process.env.MEMWAL_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;

  if (!key) throw new Error("Missing MEMWAL_PRIVATE_KEY in .env");
  if (!accountId) throw new Error("Missing MEMWAL_ACCOUNT_ID in .env");

  return { key, accountId };
}

/* ---------------- MEMWAL CLIENT ---------------- */

async function getMemWal() {
  if (memwalClient) return memwalClient;

  const { key, accountId } = checkEnv();
  const { MemWal } = await import("@mysten-incubation/memwal");

  memwalClient = MemWal.create({
    key,
    accountId,
    serverUrl: MEMWAL_SERVER_URL,
    namespace: MEMWAL_NAMESPACE,
  });

  return memwalClient;
}

/* ---------------- FILE HELPERS ---------------- */

function loadJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];

    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return [];

    return JSON.parse(raw);
  } catch (error) {
    console.error("JSON load error:", error.message);
    return [];
  }
}

function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("JSON save error:", error.message);
  }
}

/* ---------------- MEMORY INDEX ---------------- */

function loadMemoryIndex() {
  return loadJsonFile(MEMORY_INDEX_FILE);
}

function saveMemoryIndex(memories) {
  saveJsonFile(MEMORY_INDEX_FILE, memories);
}

function getSortedMemories() {
  return loadMemoryIndex().sort((a, b) => {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function addMemoryToIndex(memory) {
  const oldMemories = loadMemoryIndex();

  const alreadyExists = oldMemories.some(
    (item) => item.blobId && item.blobId === memory.blobId
  );

  if (!alreadyExists) {
    oldMemories.unshift(memory);
    saveMemoryIndex(oldMemories);
  }

  return oldMemories;
}

/* ---------------- ROAST INDEX ---------------- */

function loadRoastIndex() {
  return loadJsonFile(ROAST_INDEX_FILE);
}

function saveRoastIndex(roasts) {
  saveJsonFile(ROAST_INDEX_FILE, roasts);
}

function getSortedRoasts() {
  return loadRoastIndex().sort((a, b) => {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function addRoastToIndex(roast) {
  const oldRoasts = loadRoastIndex();
  oldRoasts.unshift(roast);
  saveRoastIndex(oldRoasts);
  return roast;
}

/* ---------------- GENERAL HELPERS ---------------- */

function getBlobId(result) {
  return (
    result?.blob_id ||
    result?.blobId ||
    result?.blob?.id ||
    result?.data?.blob_id ||
    result?.data?.blobId ||
    null
  );
}

function getJobId(result) {
  return (
    result?.job_id ||
    result?.jobId ||
    result?.id ||
    result?.data?.job_id ||
    result?.data?.jobId ||
    null
  );
}

function buildProofUrl(blobId) {
  if (!blobId) return null;
  return `${WALRUS_AGGREGATOR_URL}/${blobId}`;
}

function safeText(value) {
  return String(value || "").trim();
}

function cleanTeam(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanMood(value) {
  return String(value || "").trim().toLowerCase();
}

/* ---------------- HEALTH ---------------- */

app.get("/api/health", async (req, res) => {
  try {
    const memwal = await getMemWal();

    let health = null;
    if (typeof memwal.health === "function") {
      health = await memwal.health();
    }

    res.json({
      success: true,
      app: "The 12th Memory",
      storage: "Walrus Memory MemWal",
      namespace: MEMWAL_NAMESPACE,
      serverUrl: MEMWAL_SERVER_URL,
      health,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ---------------- SAVE MEMORY ---------------- */

async function saveMemoryHandler(req, res) {
  try {
    const body = req.body || {};

    const name = safeText(body.name) || "World Cup Fan";
    const team = safeText(body.team) || "Unknown Team";
    const predictionType = safeText(body.predictionType) || "Active Prediction";

    const prediction =
      safeText(body.prediction) ||
      safeText(body.memory) ||
      safeText(body.message) ||
      safeText(body.content);

    const mood = safeText(body.mood) || "Loyal";
    const confidence = Number(body.confidence || body.loyaltyScore || 80);

    if (!prediction) {
      return res.status(400).json({
        success: false,
        error: "Prediction / memory text missing",
      });
    }

    const readableMemory = {
      app: "The 12th Memory",
      type: "world_cup_fan_prediction",
      name,
      team,
      predictionType,
      prediction,
      mood,
      confidence,
      createdAt: new Date().toISOString(),
    };

    const memoryText = JSON.stringify(readableMemory, null, 2);

    const memwal = await getMemWal();

    console.log("Saving memory to MemWal...");
    console.log("Team:", team);
    console.log("Prediction:", prediction);
    console.log("Mood:", mood);

    let storedResult;

    if (typeof memwal.rememberAndWait === "function") {
      storedResult = await memwal.rememberAndWait(memoryText);
    } else {
      const accepted = await memwal.remember(memoryText);
      const jobId = getJobId(accepted);

      console.log("MEMWAL REMEMBER JOB:", accepted);

      if (!jobId) {
        throw new Error("MemWal remember() did not return job_id");
      }

      storedResult = await memwal.waitForRememberJob(jobId);
    }

    const blobId = getBlobId(storedResult);

    if (!blobId) {
      throw new Error("Memory saved but blob_id not found in MemWal response");
    }

    const proofUrl = buildProofUrl(blobId);

    const savedMemory = {
      id: blobId,
      name,
      team,
      predictionType,
      prediction,
      mood,
      confidence,
      blobId,
      proofUrl,
      storage: "Walrus Mainnet",
      sdk: "MemWal",
      namespace: MEMWAL_NAMESPACE,
      createdAt: readableMemory.createdAt,
    };

    addMemoryToIndex(savedMemory);

    console.log("MEMWAL FINAL RESULTS");
    console.log("blob_id:", blobId);
    console.log("proof:", proofUrl);
    console.log("WALRUS PROOF SAVED");

    res.json({
      success: true,
      message: "Memory saved on Walrus Mainnet",
      memory: savedMemory,
      blobId,
      proofUrl,
      raw: storedResult,
    });
  } catch (error) {
    console.error("Save memory error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
      message: error.message,
    });
  }
}

app.post("/api/save-memory", saveMemoryHandler);
app.post("/api/memory", saveMemoryHandler);
app.post("/api/remember", saveMemoryHandler);
app.post("/save-memory", saveMemoryHandler);

/* ---------------- GET MEMORIES ---------------- */

app.get("/api/memories", (req, res) => {
  const memories = getSortedMemories();

  res.json({
    success: true,
    count: memories.length,
    memories,
  });
});

/* ---------------- GET ROASTS ---------------- */

app.get("/api/roasts", (req, res) => {
  const roasts = getSortedRoasts();

  res.json({
    success: true,
    count: roasts.length,
    roasts,
  });
});

/* ---------------- QUICK LOYALTY BACKEND ---------------- */

app.post("/api/agent-reply", (req, res) => {
  try {
    const selectedTeam = safeText(req.body?.team);
    const memories = getSortedMemories();

    if (!memories.length) {
      return res.json({
        success: true,
        reply: `Final Loyalty Score: 0%\nSelected team: ${selectedTeam}\nReason: No saved memories found yet.`,
      });
    }

    const totalMemories = memories.length;

    const matched = memories.filter(
      (memory) => cleanTeam(memory.team) === cleanTeam(selectedTeam)
    );

    const score = Math.round((matched.length / totalMemories) * 100);

    res.json({
      success: true,
      reply:
        `Final Loyalty Score: ${score}%\n` +
        `Selected team: ${selectedTeam}\n` +
        `Saved memories for this team: ${matched.length}/${totalMemories}\n` +
        `Reason: Score is based on real saved memory count.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      reply: "Agent error. Check backend terminal.",
    });
  }
});

/* ---------------- AI CHAT AGENT ---------------- */

app.post("/api/chat", (req, res) => {
  try {
    const message = safeText(req.body?.message).toLowerCase();
    const memories = getSortedMemories();

    if (!memories.length) {
      return res.json({
        success: true,
        reply:
          "No saved memory yet. Save a World Cup prediction first, then I can remember, compare, roast, check loyalty, or show survival status.",
      });
    }

    const latest = memories[0];

    const teams = [
      "Argentina",
      "Brazil",
      "France",
      "England",
      "Portugal",
      "Germany",
      "Spain",
      "Netherlands",
      "Italy",
      "Uruguay",
      "Belgium",
      "Croatia",
      "Japan",
      "Mexico",
      "USA",
      "Canada",
    ];

    function teamMemories(team) {
      return memories.filter((m) => cleanTeam(m.team) === cleanTeam(team));
    }

    function countScoreForTeam(team) {
      const matched = teamMemories(team);
      const score = Math.round((matched.length / memories.length) * 100);

      return {
        score,
        matched,
        reason: `${matched.length}/${memories.length} memories`,
      };
    }

    function findTeamsInMessage(text) {
      return teams.filter((team) => text.includes(team.toLowerCase()));
    }

    if (message.includes("which team") || message.includes("backing")) {
      return res.json({
        success: true,
        reply:
          `You are currently backing ${latest.team}. ` +
          `Your latest prediction is: "${latest.prediction}". ` +
          `Mood: ${latest.mood || "Loyal"}. ` +
          `Confidence: ${latest.confidence || 80}%.`,
      });
    }

    /* -------- ROAST READY MEMORY SEARCH + SAVE + REUSE -------- */

    if (message.includes("roast")) {
      const roasts = getSortedRoasts();

      let targetMemory = memories.find((memory) => {
        return cleanMood(memory.mood) === "roast ready";
      });

      const mentionedTeams = findTeamsInMessage(message);
      if (mentionedTeams.length > 0) {
        const mentionedTeamMemory = memories.find((memory) => {
          return cleanTeam(memory.team) === cleanTeam(mentionedTeams[0]);
        });

        if (mentionedTeamMemory) {
          targetMemory = mentionedTeamMemory;
        }
      }

      if (!targetMemory) {
        targetMemory = latest;
      }

      const alreadyRoasted = roasts.find((roast) => {
        return (
          roast.memoryBlobId &&
          targetMemory.blobId &&
          roast.memoryBlobId === targetMemory.blobId
        );
      });

      if (alreadyRoasted) {
        return res.json({
          success: true,
          reply:
            `Last saved roast for ${alreadyRoasted.team}:\n` +
            `${alreadyRoasted.roastText}\n\n` +
            `Matched memory mood: ${alreadyRoasted.mood || "Roast Ready"}\n` +
            `Matched memory proof: ${alreadyRoasted.memoryBlobId}`,
        });
      }

      const roastText =
        `${targetMemory.team}? Bold choice 😄 ` +
        `Prediction: "${targetMemory.prediction}". ` +
        `Type: ${targetMemory.predictionType || "Active Prediction"}. ` +
        `Mood: ${targetMemory.mood || "Roast Ready"}. ` +
        `Confidence: ${targetMemory.confidence || 80}%. ` +
        `I hope this prediction survives better than a group-stage upset.`;

      const savedRoast = addRoastToIndex({
        id: `${targetMemory.blobId || Date.now()}-roast`,
        team: targetMemory.team,
        prediction: targetMemory.prediction,
        predictionType: targetMemory.predictionType,
        confidence: targetMemory.confidence,
        mood: targetMemory.mood,
        memoryBlobId: targetMemory.blobId,
        memoryProofUrl: targetMemory.proofUrl,
        roastText,
        createdAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        reply:
          `Roast saved for ${savedRoast.team}:\n` +
          `${savedRoast.roastText}\n\n` +
          `Reason: I searched Memory Timeline and selected the memory with Fan Mood = Roast Ready.`,
      });
    }

    /* -------- SHOW FOOTBALL MEMORY: TEAM NAMES ONLY -------- */

    if (
      message.includes("show my football memory") ||
      message.includes("show my memory") ||
      message.includes("remember")
    ) {
      const teamNames = memories
        .map((memory, index) => {
          const tag = index === 0 ? "Latest" : `Memory ${index + 1}`;
          return `${tag}: ${memory.team}`;
        })
        .join("\n");

      return res.json({
        success: true,
        reply:
          `Your saved football memory teams:\n\n` +
          `${teamNames}\n\n` +
          `Latest active team: ${latest.team}`,
      });
    }

    if (message.includes("compare")) {
      const mentionedTeams = findTeamsInMessage(message);

      if (mentionedTeams.length >= 2) {
        const teamA = mentionedTeams[0];
        const teamB = mentionedTeams[1];

        const scoreA = countScoreForTeam(teamA);
        const scoreB = countScoreForTeam(teamB);

        return res.json({
          success: true,
          reply:
            `${teamA} vs ${teamB} memory comparison:\n\n` +
            `${teamA}: ${scoreA.score}% loyalty · ${scoreA.reason}\n` +
            `${teamB}: ${scoreB.score}% loyalty · ${scoreB.reason}\n\n` +
            `Latest active prediction: ${latest.team}.`,
        });
      }

      return res.json({
        success: true,
        reply:
          `Your latest active prediction is ${latest.team}. ` +
          `Saved teams: ${[...new Set(memories.map((m) => m.team))].join(", ")}.`,
      });
    }

    /* -------- COUNT-BASED LOYALTY SCORE -------- */

    if (message.includes("loyalty")) {
      const totalMemories = memories.length;

      const teamCounts = {};

      memories.forEach((memory) => {
        const team = memory.team || "Unknown";
        teamCounts[team] = (teamCounts[team] || 0) + 1;
      });

      const latestTeamCount = teamCounts[latest.team] || 0;
      const latestTeamScore = Math.round((latestTeamCount / totalMemories) * 100);

      const strongestTeam = Object.entries(teamCounts).sort((a, b) => b[1] - a[1])[0];
      const strongestTeamName = strongestTeam[0];
      const strongestTeamCount = strongestTeam[1];
      const strongestTeamScore = Math.round((strongestTeamCount / totalMemories) * 100);

      const split = Object.entries(teamCounts)
        .map(([team, count]) => {
          const score = Math.round((count / totalMemories) * 100);
          return `${team}: ${score}% · ${count}/${totalMemories} memories`;
        })
        .join("\n");

      return res.json({
        success: true,
        reply:
          `Your latest team loyalty score: ${latestTeamScore}%\n` +
          `Latest team: ${latest.team} (${latestTeamCount}/${totalMemories} memories)\n\n` +
          `Strongest loyalty: ${strongestTeamName} — ${strongestTeamScore}% (${strongestTeamCount}/${totalMemories} memories)\n\n` +
          `Score split:\n${split}`,
      });
    }

    if (message.includes("match context")) {
      return res.json({
        success: true,
        reply:
          `Match context ready. Your latest tracked team is ${latest.team}, and this prediction is saved in your Memory Timeline.`,
      });
    }

    if (message.includes("schedule")) {
      return res.json({
        success: true,
        reply:
          "World Cup 2026 schedule context is ready. Save more predictions to build a stronger fan memory history.",
      });
    }

    if (
      message.includes("still alive") ||
      message.includes("survival") ||
      message.includes("alive")
    ) {
      return res.json({
        success: true,
        reply:
          `Your ${latest.team} prediction is still active in the app. ` +
          `Prediction: "${latest.prediction}". ` +
          `Confidence: ${latest.confidence}%. ` +
          `Mood: ${latest.mood || "Loyal"}. ` +
          `MemWal proof: ${latest.blobId}`,
      });
    }

    return res.json({
      success: true,
      reply:
        `I remember your latest World Cup memory: ${latest.team} — ${latest.prediction}. ` +
        `Mood: ${latest.mood || "Loyal"}.`,
    });
  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      success: false,
      reply: "Chat agent error. Check backend terminal.",
    });
  }
});

/* ---------------- OPTIONAL MATCH / SCHEDULE API ---------------- */

app.get("/api/match-context", (req, res) => {
  res.json({
    success: true,
    matches: [
      "World Cup 2026 context ready",
      "Fan predictions are tracked with Walrus proof",
      "Memory timeline updates after every saved prediction",
    ],
  });
});

app.get("/api/schedule", (req, res) => {
  res.json({
    success: true,
    schedule: [
      "World Cup 2026 schedule ready",
      "Group stage and knockout predictions can be saved",
      "More schedule data can be added later",
    ],
  });
});

/* ---------------- RECALL FROM MEMWAL ---------------- */

app.post("/api/recall", async (req, res) => {
  try {
    const query =
      safeText(req.body?.query) ||
      safeText(req.body?.prediction) ||
      "World Cup fan predictions";

    const limit = Number(req.body?.limit || 5);
    const memwal = await getMemWal();

    if (typeof memwal.recall !== "function") {
      return res.json({
        success: false,
        error: "MemWal recall method not available in this SDK version",
      });
    }

    const recalled = await memwal.recall({
      query,
      limit,
    });

    res.json({
      success: true,
      query,
      results: recalled.results || recalled,
    });
  } catch (error) {
    console.error("Recall error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/* ---------------- CLEAR LOCAL INDEX ONLY ---------------- */

app.delete("/api/memories", (req, res) => {
  saveMemoryIndex([]);

  res.json({
    success: true,
    message: "Local memory index cleared. Walrus blobs are not deleted.",
  });
});

app.delete("/api/roasts", (req, res) => {
  saveRoastIndex([]);

  res.json({
    success: true,
    message: "Local roast index cleared.",
  });
});

/* ---------------- STATIC FRONTEND ---------------- */

if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));

  app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });
}

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {
  console.log(`The 12th Memory running on http://localhost:${PORT}`);
  console.log(`MemWal namespace: ${MEMWAL_NAMESPACE}`);
  console.log(`MemWal server: ${MEMWAL_SERVER_URL}`);
});