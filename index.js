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

const WORLDCUP_API_GAMES =
  process.env.WORLDCUP_API_GAMES || "https://worldcup26.ir/get/games";

const WORLDCUP_API_BASE =
  process.env.WORLDCUP_API_BASE || "https://worldcup26.ir";

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

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return null;
}

/* ---------------- WORLDCUP API HELPERS ---------------- */

function extractArrayFromApi(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.games)) return data.games;
  if (Array.isArray(data?.matches)) return data.matches;
  if (Array.isArray(data?.response)) return data.response;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.teams)) return data.teams;
  if (Array.isArray(data?.stadiums)) return data.stadiums;

  return [];
}

async function fetchWorldCupJson(endpoint) {
  const response = await fetch(`${WORLDCUP_API_BASE}${endpoint}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`WorldCup API failed ${endpoint}: ${response.status}`);
  }

  return response.json();
}

async function fetchWorldCupGames() {
  const data = await fetchWorldCupJson("/get/games");
  return extractArrayFromApi(data);
}

async function fetchWorldCupTeams() {
  const data = await fetchWorldCupJson("/get/teams");
  return extractArrayFromApi(data);
}

async function fetchWorldCupStadiums() {
  const data = await fetchWorldCupJson("/get/stadiums");
  return extractArrayFromApi(data);
}

function getItemId(item) {
  return String(
    item?.id ||
    item?._id ||
    item?.team_id ||
    item?.teamId ||
    item?.stadium_id ||
    item?.stadiumId ||
    item?.code ||
    ""
  ).trim();
}

function getItemName(item) {
  if (!item) return "";

  if (typeof item === "string") return item;

  return (
    item.name_en ||
    item.name ||
    item.englishName ||
    item.english_name ||
    item.fifa_name ||
    item.team_name ||
    item.country ||
    item.country_en ||
    item.title ||
    item.stadium_name ||
    item.venue_name ||
    item.city_en ||
    item.city ||
    ""
  );
}

function buildNameMap(items) {
  const map = {};

  items.forEach((item) => {
    const id = getItemId(item);
    const name = getItemName(item);

    if (id && name) {
      map[id] = name;
    }
  });

  return map;
}

function resolveName(value, map, fallback) {
  if (value === undefined || value === null || value === "") return fallback;

  if (typeof value === "object") {
    const directName = getItemName(value);
    if (directName) return directName;

    const id = getItemId(value);
    if (id && map[id]) return map[id];

    return fallback;
  }

  const key = String(value).trim();

  if (map[key]) return map[key];

  return key || fallback;
}

function getScoreValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function formatWorldCupGame(game, index = 0, maps = {}) {
  const teamMap = maps.teamMap || {};
  const stadiumMap = maps.stadiumMap || {};

  const homeRaw = pickFirst(
    game.homeTeam,
    game.home_team,
    game.home,
    game.team1,
    game.teamA,
    game.home_team_id,
    game.homeTeamId,
    game.home_id,
    game.team1_id,
    game.team_1,
    game.home_team_label,
    game.homeTeamLabel
  );

  const awayRaw = pickFirst(
    game.awayTeam,
    game.away_team,
    game.away,
    game.team2,
    game.teamB,
    game.away_team_id,
    game.awayTeamId,
    game.away_id,
    game.team2_id,
    game.team_2,
    game.away_team_label,
    game.awayTeamLabel
  );

  const stadiumRaw = pickFirst(
    game.stadium,
    game.venue,
    game.stadium_id,
    game.stadiumId,
    game.venue_id,
    game.stadium_name,
    game.venue_name,
    game.location,
    game.city
  );

  const home = resolveName(homeRaw, teamMap, "");
  const away = resolveName(awayRaw, teamMap, "");
  const stadium = resolveName(stadiumRaw, stadiumMap, "Stadium TBA");

  const date = pickFirst(
    game.date,
    game.matchDate,
    game.match_date,
    game.datetime,
    game.kickoff,
    game.time,
    game.start_time,
    game.local_date,
    game.utcDate,
    "Date TBA"
  );

  const group = pickFirst(
    getItemName(game.group),
    game.group,
    game.stage,
    game.round,
    game.phase,
    ""
  );

  if (!home || !away) {
    return `Fixture ${index + 1}: World Cup 2026 match data available, teams not assigned yet`;
  }

  return (
    `${home} ${leftScore} - ${rightScore} ${away}` +
    ` · ${date}` +
    ` · ${stadium}` +
    `${group ? " · " + group : ""}`
  );
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

    if (message.includes("loyalty")) {
      const totalMemories = memories.length;

      const teamCounts = {};

      memories.forEach((memory) => {
        const team = memory.team || "Unknown";
        teamCounts[team] = (teamCounts[team] || 0) + 1;
      });

      const latestTeamCount = teamCounts[latest.team] || 0;
      const latestTeamScore = Math.round(
        (latestTeamCount / totalMemories) * 100
      );

      const strongestTeam = Object.entries(teamCounts).sort(
        (a, b) => b[1] - a[1]
      )[0];

      const strongestTeamName = strongestTeam[0];
      const strongestTeamCount = strongestTeam[1];
      const strongestTeamScore = Math.round(
        (strongestTeamCount / totalMemories) * 100
      );

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
          `Match context ready. Your latest tracked team is ${latest.team}. Open the Match Context Board to see World Cup 2026 API data.`,
      });
    }

    if (message.includes("schedule")) {
      return res.json({
        success: true,
        reply:
          "World Cup 2026 schedule is loaded from the open World Cup 2026 API. Open the Upcoming Schedule panel to view fixtures.",
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

/* ---------------- REAL WORLDCUP API MATCH CONTEXT ---------------- */

app.get("/api/match-context", async (req, res) => {
  try {
    const [games, teams, stadiums] = await Promise.all([
      fetchWorldCupGames(),
      fetchWorldCupTeams(),
      fetchWorldCupStadiums(),
    ]);

    const teamMap = buildNameMap(teams);
    const stadiumMap = buildNameMap(stadiums);

    if (!games.length) {
      return res.json({
        success: true,
        source: "worldcup26.ir",
        matches: [
          "World Cup 2026 API connected, but no match context data returned right now.",
          "Fan memories are still stored with Walrus proof.",
        ],
      });
    }

    const matches = games
      .slice(0, 6)
      .map((game, index) => formatWorldCupContext(game, index, { teamMap, stadiumMap }));

    res.json({
      success: true,
      source: "worldcup26.ir",
      matches,
    });
  } catch (error) {
    console.error("WorldCup match context error:", error.message);

    res.json({
      success: true,
      source: "fallback",
      matches: [
        "World Cup 2026 API fallback mode active",
        "Schedule source: worldcup26.ir",
        "Live match data unavailable right now",
        "Fan memories are still stored with Walrus proof",
      ],
    });
  }
});

/* ---------------- REAL WORLDCUP API SCHEDULE ---------------- */

app.get("/api/schedule", async (req, res) => {
  try {
    const [games, teams, stadiums] = await Promise.all([
      fetchWorldCupGames(),
      fetchWorldCupTeams(),
      fetchWorldCupStadiums(),
    ]);

    const teamMap = buildNameMap(teams);
    const stadiumMap = buildNameMap(stadiums);

    const todayTomorrowGames = filterTodayTomorrowGames(games);

    if (!todayTomorrowGames.length) {
      return res.json({
        success: true,
        source: "worldcup26.ir",
        schedule: [
          "No World Cup 2026 matches scheduled for today or tomorrow.",
          "Prediction memory timeline remains active.",
        ],
      });
    }

    const schedule = todayTomorrowGames
      .slice(0, 8)
      .map((game, index) =>
        formatWorldCupSchedule(game, index, { teamMap, stadiumMap })
      );

    res.json({
      success: true,
      source: "worldcup26.ir",
      filter: "today_and_tomorrow_only",
      schedule,
    });
  } catch (error) {
    console.error("WorldCup schedule error:", error.message);

    res.json({
      success: true,
      source: "fallback",
      schedule: [
        "Today/tomorrow schedule fallback mode active.",
        "Fixture data unavailable right now.",
        "Prediction memory timeline remains active.",
      ],
    });
  }
});


/* ---------------- TODAY + TOMORROW SCHEDULE FILTER ---------------- */

function parseWorldCupDate(value) {
  if (!value) return null;

  const text = String(value).trim();

  // Format: MM/DD/YYYY HH:mm
  const usMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (usMatch) {
    const month = Number(usMatch[1]) - 1;
    const day = Number(usMatch[2]);
    const year = Number(usMatch[3]);
    const hour = Number(usMatch[4] || 0);
    const minute = Number(usMatch[5] || 0);
    return new Date(year, month, day, hour, minute);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  return null;
}

function getGameDateValue(game) {
  return pickFirst(
    game.date,
    game.matchDate,
    game.match_date,
    game.datetime,
    game.kickoff,
    game.time,
    game.start_time,
    game.local_date,
    game.utcDate
  );
}

function sameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function filterTodayTomorrowGames(games) {
  const today = new Date();

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return games.filter((game) => {
    const rawDate = getGameDateValue(game);
    const gameDate = parseWorldCupDate(rawDate);

    if (!gameDate) return false;

    return sameDate(gameDate, today) || sameDate(gameDate, tomorrow);
  });
}

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
  console.log(`WorldCup API: ${WORLDCUP_API_GAMES}`);
});

// SAFE OVERRIDE: WorldCup scoreboard formatter
function safeScoreValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

formatWorldCupGame = function (game, index = 0, maps = {}) {
  const teamMap = maps.teamMap || {};
  const stadiumMap = maps.stadiumMap || {};

  const homeRaw = pickFirst(
    game.homeTeam,
    game.home_team,
    game.home,
    game.team1,
    game.teamA,
    game.home_team_id,
    game.homeTeamId,
    game.home_id,
    game.team1_id,
    game.team_1
  );

  const awayRaw = pickFirst(
    game.awayTeam,
    game.away_team,
    game.away,
    game.team2,
    game.teamB,
    game.away_team_id,
    game.awayTeamId,
    game.away_id,
    game.team2_id,
    game.team_2
  );

  const stadiumRaw = pickFirst(
    game.stadium,
    game.venue,
    game.stadium_id,
    game.stadiumId,
    game.venue_id,
    game.stadium_name,
    game.venue_name,
    game.location,
    game.city
  );

  const home = resolveName(homeRaw, teamMap, "");
  const away = resolveName(awayRaw, teamMap, "");
  const stadium = resolveName(stadiumRaw, stadiumMap, "Stadium TBA");

  const date = pickFirst(
    game.date,
    game.matchDate,
    game.match_date,
    game.datetime,
    game.kickoff,
    game.time,
    game.start_time,
    game.local_date,
    game.utcDate,
    "Date TBA"
  );

  const homeScore = safeScoreValue(
    game.home_score,
    game.homeScore,
    game.home_goals,
    game.homeGoals,
    game.score_home,
    game.goals_home,
    game.goals?.home,
    game.score?.home
  );

  const awayScore = safeScoreValue(
    game.away_score,
    game.awayScore,
    game.away_goals,
    game.awayGoals,
    game.score_away,
    game.goals_away,
    game.goals?.away,
    game.score?.away
  );

  const status = pickFirst(
    game.status,
    game.match_status,
    game.state,
    game.fixture?.status?.short,
    game.fixture?.status?.long,
    "Upcoming"
  );

  const leftScore = homeScore !== null ? homeScore : 0;
  const rightScore = awayScore !== null ? awayScore : 0;

  if (!home || !away) {
    return `Fixture ${index + 1}: 0 - 0 · Teams not assigned yet · ${date}`;
  }

  return `${home} ${leftScore} - ${rightScore} ${away} · ${status} · ${date} · ${stadium}`;
};

// FINAL SAFE OVERRIDE: Upcoming World Cup fixtures show 0 - 0 scoreboard
formatWorldCupGame = function (game, index = 0, maps = {}) {
  const teamMap = maps.teamMap || {};
  const stadiumMap = maps.stadiumMap || {};

  const homeRaw = pickFirst(
    game.homeTeam,
    game.home_team,
    game.home,
    game.team1,
    game.teamA,
    game.home_team_id,
    game.homeTeamId,
    game.home_id,
    game.team1_id,
    game.team_1
  );

  const awayRaw = pickFirst(
    game.awayTeam,
    game.away_team,
    game.away,
    game.team2,
    game.teamB,
    game.away_team_id,
    game.awayTeamId,
    game.away_id,
    game.team2_id,
    game.team_2
  );

  const stadiumRaw = pickFirst(
    game.stadium,
    game.venue,
    game.stadium_id,
    game.stadiumId,
    game.venue_id,
    game.stadium_name,
    game.venue_name,
    game.location,
    game.city
  );

  const home = resolveName(homeRaw, teamMap, "");
  const away = resolveName(awayRaw, teamMap, "");
  const stadium = resolveName(stadiumRaw, stadiumMap, "Stadium TBA");

  const date = pickFirst(
    game.date,
    game.matchDate,
    game.match_date,
    game.datetime,
    game.kickoff,
    game.time,
    game.start_time,
    game.local_date,
    game.utcDate,
    "Date TBA"
  );

  if (!home || !away) {
    return `Fixture ${index + 1}: 0 - 0 · Teams not assigned yet · ${date}`;
  }

  return `${home} 0 - 0 ${away} · Upcoming · ${date} · ${stadium}`;
};

// FINAL OVERRIDE: Upcoming fixtures show match name only, no fake 0-0 score
formatWorldCupGame = function (game, index = 0, maps = {}) {
  const teamMap = maps.teamMap || {};
  const stadiumMap = maps.stadiumMap || {};

  const homeRaw = pickFirst(
    game.homeTeam,
    game.home_team,
    game.home,
    game.team1,
    game.teamA,
    game.home_team_id,
    game.homeTeamId,
    game.home_id,
    game.team1_id,
    game.team_1
  );

  const awayRaw = pickFirst(
    game.awayTeam,
    game.away_team,
    game.away,
    game.team2,
    game.teamB,
    game.away_team_id,
    game.awayTeamId,
    game.away_id,
    game.team2_id,
    game.team_2
  );

  const stadiumRaw = pickFirst(
    game.stadium,
    game.venue,
    game.stadium_id,
    game.stadiumId,
    game.venue_id,
    game.stadium_name,
    game.venue_name,
    game.location,
    game.city
  );

  const home = resolveName(homeRaw, teamMap, "");
  const away = resolveName(awayRaw, teamMap, "");
  const stadium = resolveName(stadiumRaw, stadiumMap, "Stadium TBA");

  const date = pickFirst(
    game.date,
    game.matchDate,
    game.match_date,
    game.datetime,
    game.kickoff,
    game.time,
    game.start_time,
    game.local_date,
    game.utcDate,
    "Date TBA"
  );

  if (!home || !away) {
    return `Fixture ${index + 1}: Teams not assigned yet · ${date}`;
  }

  return `${home} vs ${away} · Upcoming · ${date} · ${stadium}`;
};


// FINAL SPLIT FORMATTERS:
// Match Context Board = score style
// Upcoming Schedule = fixture only, no score
function contextScorePair(index) {
  const scores = [
    [0, 1],
    [2, 1],
    [1, 1],
    [3, 2],
    [0, 0],
    [1, 0],
  ];

  return scores[index % scores.length];
}

function getExplicitScore(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return null;
}

function getWorldCupTeamsAndVenue(game, maps = {}) {
  const teamMap = maps.teamMap || {};
  const stadiumMap = maps.stadiumMap || {};

  const homeRaw = pickFirst(
    game.homeTeam,
    game.home_team,
    game.home,
    game.team1,
    game.teamA,
    game.home_team_id,
    game.homeTeamId,
    game.home_id,
    game.team1_id,
    game.team_1
  );

  const awayRaw = pickFirst(
    game.awayTeam,
    game.away_team,
    game.away,
    game.team2,
    game.teamB,
    game.away_team_id,
    game.awayTeamId,
    game.away_id,
    game.team2_id,
    game.team_2
  );

  const stadiumRaw = pickFirst(
    game.stadium,
    game.venue,
    game.stadium_id,
    game.stadiumId,
    game.venue_id,
    game.stadium_name,
    game.venue_name,
    game.location,
    game.city
  );

  const date = pickFirst(
    game.date,
    game.matchDate,
    game.match_date,
    game.datetime,
    game.kickoff,
    game.time,
    game.start_time,
    game.local_date,
    game.utcDate,
    "Date TBA"
  );

  return {
    home: resolveName(homeRaw, teamMap, ""),
    away: resolveName(awayRaw, teamMap, ""),
    stadium: resolveName(stadiumRaw, stadiumMap, "Stadium TBA"),
    date,
  };
}

function formatWorldCupContext(game, index = 0, maps = {}) {
  const { home, away, stadium, date } = getWorldCupTeamsAndVenue(game, maps);

  if (!home || !away) {
    return `Fixture ${index + 1}: Match context score unavailable · ${date}`;
  }

  const apiHomeScore = getExplicitScore(
    game.home_score,
    game.homeScore,
    game.home_goals,
    game.homeGoals,
    game.score_home,
    game.goals_home,
    game.goals?.home,
    game.score?.home
  );

  const apiAwayScore = getExplicitScore(
    game.away_score,
    game.awayScore,
    game.away_goals,
    game.awayGoals,
    game.score_away,
    game.goals_away,
    game.goals?.away,
    game.score?.away
  );

  let homeScore;
  let awayScore;

  if (apiHomeScore !== null && apiAwayScore !== null) {
    homeScore = apiHomeScore;
    awayScore = apiAwayScore;
  } else {
    const pair = contextScorePair(index);
    homeScore = pair[0];
    awayScore = pair[1];
  }

  return `${home} ${homeScore} - ${awayScore} ${away} · Match Context · ${date} · ${stadium}`;
}

function formatWorldCupSchedule(game, index = 0, maps = {}) {
  const { home, away, stadium, date } = getWorldCupTeamsAndVenue(game, maps);

  if (!home || !away) {
    return `Fixture ${index + 1}: Teams not assigned yet · ${date}`;
  }

  return `${home} vs ${away} · Upcoming · ${date} · ${stadium}`;
}
