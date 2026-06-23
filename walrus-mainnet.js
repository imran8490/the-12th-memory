let cachedClient = null;
let cachedKeypair = null;

async function getWalrusMainnet() {
  if (cachedClient && cachedKeypair) {
    return { client: cachedClient, keypair: cachedKeypair };
  }

  const { SuiJsonRpcClient } = await import("@mysten/sui/jsonRpc");
  const { Ed25519Keypair } = await import("@mysten/sui/keypairs/ed25519");
  const { decodeSuiPrivateKey } = await import("@mysten/sui/cryptography");
  const { walrus } = await import("@mysten/walrus");

  if (!process.env.SUI_PRIVATE_KEY) {
    throw new Error("Missing SUI_PRIVATE_KEY environment variable");
  }

  const decoded = decodeSuiPrivateKey(process.env.SUI_PRIVATE_KEY);
  const keypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);

  const suiClient = new SuiJsonRpcClient({
    network: "mainnet",
    url: process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io:443"
  });

  const client = suiClient.$extend(walrus());

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

  const blob = new TextEncoder().encode(JSON.stringify(memoryPayload, null, 2));

  const result = await client.writeBlob({
    blob,
    deletable: false,
    epochs: 1,
    signer: keypair
  });

  return {
    blobId: result.blobId || result.blob_id || result.newlyCreated?.blobObject?.blob_id || null,
    blobObjectId:
      result.blobObject?.id?.id ||
      result.blobObject?.id ||
      result.newlyCreated?.blobObject?.id ||
      null
  };
}

async function readMemoryFromWalrus(blobId) {
  const { client } = await getWalrusMainnet();

  const bytes = await client.readBlob({ blobId });
  const text = new TextDecoder().decode(bytes);

  return JSON.parse(text);
}

module.exports = {
  storeMemoryOnWalrus,
  readMemoryFromWalrus
};
