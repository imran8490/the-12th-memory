const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DB_FILE = path.join(__dirname, "memory.json");

const demoMatches = [
  {
    id: 1,
    status: "MATCH_CONTEXT",
    homeTeam: "Argentina",
    awayTeam: "Brazil",
    homeScore: 2,
    awayScore: 1,
    minute: "67'",
    date: "12 Jun 2026",
    time: "22:30",
    stadium: "MetLife Stadium",
    context: "Argentina is currently leading Brazil in the demo match context."
  },
  {
    id: 2,
    status: "MATCH_CONTEXT",
    homeTeam: "France",
    awayTeam: "Germany",
    homeScore: 0,
    awayScore: 0,
    minute: "31'",
    date: "12 Jun 2026",
    time: "23:00",
    stadium: "SoFi Stadium",
    context: "France and Germany are level in the demo match context."
  },
  {
    id: 3,
    status: "UPCOMING",
    homeTeam: "England",
    awayTeam: "Portugal",
    date: "13 Jun 2026",
    time: "00:30",
    stadium: "AT&T Stadium"
  },
  {
    id: 4,
    status: "UPCOMING",
    homeTeam: "Spain",
    awayTeam: "Netherlands",
    date: "13 Jun 2026",
    time: "03:00",
    stadium: "Hard Rock Stadium"
  },
  {
    id: 5,
    status: "UPCOMING",
    homeTeam: "Italy",
    awayTeam: "Uruguay",
    date: "14 Jun 2026",
    time: "01:00",
    stadium: "Levi's Stadium"
  },
  {
    id: 6,
    status: "UPCOMING",
    homeTeam: "Belgium",
    awayTeam: "Croatia",
    date: "14 Jun 2026",
    time: "04:00",
    stadium: "Mercedes-Benz Stadium"
  },
  {
    id: 7,
    status: "UPCOMING",
    homeTeam: "Japan",
    awayTeam: "Mexico",
    date: "15 Jun 2026",
    time: "00:30",
    stadium: "NRG Stadium"
  },
  {
    id: 8,
    status: "UPCOMING",
    homeTeam: "USA",
    awayTeam: "Canada",
    date: "15 Jun 2026",
    time: "03:30",
    stadium: "Lumen Field"
  }
];

function readMemory() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
  }

  const data = fs.readFileSync(DB_FILE, "utf8");
  return JSON.parse(data || "[]");
}

function writeMemory(memories) {
  fs.writeFileSync(DB_FILE, JSON.stringify(memories, null, 2));
}

function getSurvivalStatus(memory) {
  const match = demoMatches.find(
    (item) =>
      item.status === "MATCH_CONTEXT" &&
      (item.homeTeam === memory.team || item.awayTeam === memory.team)
  );

  if (!match) {
    return {
      label: "Waiting for Kickoff",
      emoji: "⏳",
      className: "waiting"
    };
  }

  const isHome = match.homeTeam === memory.team;
  const teamScore = isHome ? match.homeScore : match.awayScore;
  const opponentScore = isHome ? match.awayScore : match.homeScore;

  if (teamScore > opponentScore) {
    return {
      label: "Alive",
      emoji: "✅",
      className: "alive"
    };
  }

  if (teamScore === opponentScore) {
    return {
      label: "Under VAR Review",
      emoji: "👀",
      className: "var"
    };
  }

  return {
    label: "In Danger",
    emoji: "⚠️",
    className: "danger"
  };
}

function calculateLoyalty(memories) {
  if (!memories.length) return 0;

  const firstTeam = memories[memories.length - 1].team;
  const sameTeamCount = memories.filter((memory) => memory.team === firstTeam).length;

  if (memories.length === 1) {
    return Number(memories[0].confidence);
  }

  return Math.round((sameTeamCount / memories.length) * 100);
}

function createAgentReply(message, memories) {
  if (!message || message.trim() === "") {
    return "Ask me about your World Cup prediction, memory, loyalty, match context, schedule, or survival status.";
  }

  const text = message.toLowerCase();

  if (
    text.includes("match context") ||
    text.includes("demo match") ||
    text.includes("match board")
  ) {
    const contextMatches = demoMatches.filter((match) => match.status === "MATCH_CONTEXT");

    return contextMatches
      .map((match) => {
        return `${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam} at ${match.minute}, ${match.stadium}. ${match.context}`;
      })
      .join(" ");
  }

  if (
    text.includes("schedule") ||
    text.includes("next match") ||
    text.includes("upcoming")
  ) {
    const schedule = demoMatches.filter((match) => match.status === "UPCOMING");

    return schedule
      .map((match) => {
        return `${match.homeTeam} vs ${match.awayTeam} on ${match.date} at ${match.time}, ${match.stadium}.`;
      })
      .join(" ");
  }

  if (memories.length === 0) {
    return "Your 12th Memory is empty. Save your first World Cup 2026 prediction so I can remember your football take.";
  }

  const latest = memories[0];
  const first = memories[memories.length - 1];
  const survival = getSurvivalStatus(latest);
  const loyalty = calculateLoyalty(memories);

  if (
    text.includes("which team") ||
    text.includes("backing") ||
    text.includes("support")
  ) {
    return `You are currently backing ${latest.team} with ${latest.confidence}% confidence. Your latest prediction is: "${latest.prediction}".`;
  }

  if (text.includes("roast")) {
    return `Roast mode activated 😭 You backed ${latest.team} with ${latest.confidence}% confidence. Prediction status: ${survival.emoji} ${survival.label}. If you switch teams again, your 12th Memory will bring receipts.`;
  }

  if (
    text.includes("old") ||
    text.includes("previous") ||
    text.includes("memory") ||
    text.includes("football memory")
  ) {
    return `Your stored memory says you supported ${latest.team}. Prediction: "${latest.prediction}". Confidence: ${latest.confidence}%. Mood: ${latest.mood}. Survival status: ${survival.emoji} ${survival.label}.`;
  }

  if (text.includes("loyalty")) {
    return `Your fan loyalty score is ${loyalty}%. Your first recorded team was ${first.team}. Latest team memory: ${latest.team}.`;
  }

  if (
    text.includes("survival") ||
    text.includes("alive") ||
    text.includes("status")
  ) {
    return `Your latest prediction for ${latest.team} is currently: ${survival.emoji} ${survival.label}. This is calculated using saved fan memory and demo World Cup match context.`;
  }

  if (text.includes("compare") || text.includes("vs")) {
    return `Based on your memory, you currently lean toward ${latest.team}. Your first recorded team was ${first.team}. If you change teams again, The 12th Memory will expose the switch with proof.`;
  }

  return `I remember your latest World Cup take: you backed ${latest.team} with ${latest.confidence}% confidence. Prediction: "${latest.prediction}". Status: ${survival.emoji} ${survival.label}. Ask me to roast it, compare it, show your memory, or check your loyalty score.`;
}

app.post("/api/save-memory", (req, res) => {
  const { name, team, predictionType, prediction, confidence, mood } = req.body;

  if (!name || !team || !prediction || !confidence) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  const memories = readMemory();
  const survival = getSurvivalStatus({ team });

  const newMemory = {
    id: Date.now(),
    name,
    team,
    predictionType,
    prediction,
    confidence,
    mood,
    survivalStatus: survival.label,
    survivalEmoji: survival.emoji,
    survivalClass: survival.className,
    createdAt: new Date().toISOString(),
    walrusStatus: "Demo mode - Walrus Mainnet integration next",
    walrusProof: `demo_blob_${Date.now()}`
  };

  memories.unshift(newMemory);
  writeMemory(memories);

  res.json({
    success: true,
    message: "12th Memory saved successfully",
    memory: newMemory
  });
});

app.get("/api/memories", (req, res) => {
  const memories = readMemory();

  const updatedMemories = memories.map((memory) => {
    const survival = getSurvivalStatus(memory);

    return {
      ...memory,
      survivalStatus: survival.label,
      survivalEmoji: survival.emoji,
      survivalClass: survival.className
    };
  });

  res.json({
    success: true,
    memories: updatedMemories
  });
});
app.get("/api/clear-memory", (req, res) => {
  writeMemory([]);

  res.json({
    success: true,
    message: "All memories cleared successfully"
  });
});

app.get("/api/match-context", (req, res) => {
  const matches = demoMatches.filter((match) => match.status === "MATCH_CONTEXT");

  res.json({
    success: true,
    matches
  });
});

app.get("/api/schedule", (req, res) => {
  const matches = demoMatches.filter((match) => match.status === "UPCOMING");

  res.json({
    success: true,
    matches
  });
});

app.get("/api/all-matches", (req, res) => {
  res.json({
    success: true,
    matches: demoMatches
  });
});

app.post("/api/chat", (req, res) => {
  const { message } = req.body;
  const memories = readMemory();

  const reply = createAgentReply(message, memories);

  res.json({
    success: true,
    reply
  });
});

app.post("/api/agent-reply", (req, res) => {
  const { team } = req.body;
  const memories = readMemory();

  if (memories.length === 0) {
    return res.json({
      reply: "Your 12th Memory is empty. Save your first World Cup prediction."
    });
  }

  const lastMemory = memories[0];

  if (team && team !== lastMemory.team) {
    return res.json({
      reply: `Last time you backed ${lastMemory.team} with ${lastMemory.confidence}% confidence. Now you are looking at ${team}? Your 12th Memory says your loyalty is under VAR review 😭`
    });
  }

  res.json({
    reply: `Your 12th Memory remembers that you backed ${lastMemory.team} with ${lastMemory.confidence}% confidence. Your fan energy is still alive.`
  });
});

app.listen(PORT, () => {
  console.log(`The 12th Memory running at http://localhost:${PORT}`);
});
