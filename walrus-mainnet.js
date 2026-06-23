let cachedClient = null;
let cachedKeypair = null;

function safeJson(value) {
  return JSON.parse(
    JSON.stringify(value, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    )
  );
}

function findValueByKey(obj, keys) {
  if (!obj || typeof obj !== "object") return null;

  for (const key of keys) {
    if (obj[key]) return obj[key];
  }

  for (const value of Object.values(obj)) {
    const found = findValueByKey(value, keys);
    if (found) return found;
  }

  return null;
}

async function getWalrusMainnet() {
  if (cachedClient && cachedKeypair) {
    return { client: cachedClient, keypair: cachedKeypair };
  }

  const { SuiGrpcClient } = await import("@mysten/sui/grpc");
  const { Ed25519Keypair } = await import("@mysten/sui/keypairs/ed25519");
  const { decodeSuiPrivateKey } = await import("@mysten/sui/cryptography");
  const { walrus } = await import("@mysten/walrus");

  if (!process.env.SUI_PRIVATE_KEY) {
    throw new Error("Missing SUI_PRIVATE_KEY environment variable");
  }

  const decoded = decodeSuiPrivateKey(process.env.SUI_PRIVATE_KEY);
  const keypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);

  const client = new SuiGrpcClient({
    network: "mainnet",
    baseUrl: process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io:443"
  }).$extend(walrus());

  cachedClient = client;
  cachedKeypair = keypair;

  return { client, keypair };
}

async function storeMemoryOnWalrus(memory) {
  const { client, keypair } = await getWalrusMainnet();

  const memoryPayload = {
    app: "The 12th Memory",
    network: "walrus-mainnet",
    type: "world-cup-fan-memory",
    version: "1.0.0",
    memory
  };

  const blob = new TextEncoder().encode(
    JSON.stringify(memoryPayload, null, 2)
  );

  const result = await client.walrus.writeBlob({
    blob,
    deletable: false,
    epochs: 1,
    signer: keypair
  });

  const safeResult = safeJson(result);
  console.log("WALRUS WRITE RESULT:", safeResult);

  const blobId =
    findValueByKey(safeResult, ["blobId", "blob_id", "blobID"]) || null;

  const blobObjectId =
    findValueByKey(safeResult, ["blobObjectId", "blob_object_id"]) ||
    findValueByKey(safeResult, ["objectId", "object_id"]) ||
    findValueByKey(safeResult, ["id"]) ||
    null;

  const txDigest =
    findValueByKey(safeResult, [
      "digest",
      "txDigest",
      "transactionDigest",
      "transaction_digest"
    ]) || null;

  return {
    blobId: blobId || `walrus_tx_${txDigest || Date.now()}`,
    blobObjectId,
    txDigest,
    rawResult: safeResult
  };
}

async function readMemoryFromWalrus(blobId) {
  const { client } = await getWalrusMainnet();

  if (!blobId) {
    throw new Error("Missing blobId");
  }

  if (blobId.startsWith("walrus_tx_")) {
    throw new Error("This proof is a transaction digest, not a readable blob id");
  }

  const bytes = await client.walrus.readBlob({ blobId });
  const text = new TextDecoder().decode(bytes);

  return JSON.parse(text);
}

module.exports = {
  storeMemoryOnWalrus,
  readMemoryFromWalrus
};
