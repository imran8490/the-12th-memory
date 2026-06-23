require("dotenv").config();

const express = require("express");
const path = require("path");
const { storeMemoryOnWalrus } = require("./walrus-mainnet");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const memories = [];

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
    const walrusResult = await storeMemoryOnWalrus(newMemory);

    const proof =
      walrusResult.blobObjectId ||
      walrusResult.blobId ||
      walrusResult.txDigest ||
      "walrus_mainnet_saved";

    const explorer = buildWalrusExplorer(walrusResult);

    newMemory.walrusProof = proof;
    newMemory.walrusExplorer = explorer;
    newMemory.storage = "Walrus Mainnet";
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
      message: "Walrus upload failed. Check Render logs.",
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

app.listen(PORT, function () {
  console.log("The 12th Memory running on port " + PORT);
  console.log("Storage mode: Walrus Mainnet");
});
