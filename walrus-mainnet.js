require("dotenv").config();

const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
const { SuiGrpcClient } = require("@mysten/sui/grpc");
const { walrus } = require("@mysten/walrus");

const SUIVISION_OBJECT_URL = "https://suivision.xyz/object";
const SUIVISION_TX_URL = "https://suivision.xyz/txblock";

function safeJson(value) {
  return JSON.parse(
    JSON.stringify(value, function (_, v) {
      if (typeof v === "bigint") return v.toString();
      return v;
    })
  );
}

function findValueByKey(obj, keys) {
  if (!obj || typeof obj !== "object") return null;

  for (const key of Object.keys(obj)) {
    if (keys.includes(key)) return obj[key];

    const found = findValueByKey(obj[key], keys);
    if (found) return found;
  }

  return null;
}

function findWalrusBlobObjectId(result) {
  const text = JSON.stringify(result, function (_, value) {
    if (typeof value === "bigint") return value.toString();
    return value;
  });

  const matches = text.match(/0x[a-fA-F0-9]{64}/g);
  if (!matches || matches.length === 0) return null;

  for (const id of matches) {
    const index = text.indexOf(id);
    const nearby = text.slice(Math.max(0, index - 1000), index + 1000);

    if (
      nearby.includes("blob::Blob") ||
      nearby.includes("BlobRegistered") ||
      nearby.includes("walrus") ||
      nearby.includes("Walrus") ||
      nearby.includes("blob")
    ) {
      return id;
    }
  }

  return matches[0];
}

function createKeypair() {
  const privateKey = process.env.SUI_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("SUI_PRIVATE_KEY missing in Render environment");
  }

  return Ed25519Keypair.fromSecretKey(privateKey);
}

async function getWalrusClient() {
  const suiClient = new SuiGrpcClient({
    network: "mainnet",
    baseUrl: "https://fullnode.mainnet.sui.io:443"
  });

  return suiClient.$extend(
    walrus()
  );
}

async function storeMemoryOnWalrus(memory) {
  const keypair = createKeypair();
  const client = await getWalrusClient();

  const memoryPayload = {
    project: "The 12th Memory",
    type: "world_cup_fan_memory",
    createdAt: new Date().toISOString(),
    memory: memory
  };

  const blob = new TextEncoder().encode(JSON.stringify(memoryPayload));

  let result;
let lastError;

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    console.log("Walrus write attempt:", attempt);

    result = await client.walrus.writeBlob({
      blob: blob,
      deletable: false,
      epochs: 2,
      signer: keypair
    });

    break;
  } catch (err) {
    lastError = err;
    console.error("Walrus write attempt failed:", attempt, err.message || err);

    if (attempt < 3) {
      await new Promise(function (resolve) {
        setTimeout(resolve, 5000);
      });
    }
  }
}

if (!result) {
  throw lastError;
}
  const safeResult = safeJson(result);

  console.log("WALRUS WRITE RESULT:", JSON.stringify(safeResult, null, 2));

  const blobId =
    findValueByKey(safeResult, [
      "blobId",
      "blob_id",
      "blobID",
      "encodedBlobId",
      "blob_id_base64"
    ]) || null;

  const blobObjectId =
    findValueByKey(safeResult, [
      "blobObjectId",
      "blob_object_id",
      "objectId",
      "object_id"
    ]) || findWalrusBlobObjectId(safeResult);

  const txDigest =
    findValueByKey(safeResult, [
      "digest",
      "txDigest",
      "transactionDigest",
      "transaction_digest"
    ]) || null;

  const explorerUrl = blobObjectId
    ? SUIVISION_OBJECT_URL + "/" + blobObjectId
    : txDigest
      ? SUIVISION_TX_URL + "/" + txDigest
      : null;

  return {
    success: true,
    blobId: blobId || blobObjectId || txDigest || null,
    blobObjectId: blobObjectId,
    txDigest: txDigest,
    explorerUrl: explorerUrl,
    rawResult: safeResult
  };
}

async function readMemoryFromWalrus(blobId) {
  if (!blobId) {
    throw new Error("Blob ID missing");
  }

  if (blobId.startsWith("walrus_tx_")) {
    throw new Error("This is transaction fallback, not readable blob id");
  }

  const client = await getWalrusClient();

  const result = await client.walrus.readBlob({
    blobId: blobId
  });

  const text = new TextDecoder().decode(result);
  return JSON.parse(text);
}

module.exports = {
  storeMemoryOnWalrus,
  readMemoryFromWalrus
};
