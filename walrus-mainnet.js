let cachedClient = null;
let cachedKeypair = null;

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

  const blob = new TextEncoder().encode(JSON.stringify(memoryPayload, null, 2));

  const result = await client.walrus.writeBlob({
    blob,
    deletable: false,
    epochs: 1,
    signer: keypair
  });

 const safeResult = JSON.parse(
  JSON.stringify(result, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  )
);

console.log("WALRUS WRITE RESULT:", safeResult);
const blobId =
  safeResult.blobId ||
  safeResult.blob_id ||
  safeResult.newlyCreated?.blobObject?.blobId ||
  safeResult.newlyCreated?.blobObject?.blob_id ||
  safeResult.newlyCreated?.blobObject?.blob_id?.id ||
  safeResult.alreadyCertified?.blobId ||
  safeResult.alreadyCertified?.blob_id ||
  safeResult.blobObject?.blobId ||
  safeResult.blobObject?.blob_id ||
  null;

const blobObjectId =
  safeResult.blobObject?.id?.id ||
  safeResult.blobObject?.id ||
  safeResult.newlyCreated?.blobObject?.id?.id ||
  safeResult.newlyCreated?.blobObject?.id ||
  safeResult.alreadyCertified?.blobObject?.id?.id ||
  safeResult.alreadyCertified?.blobObject?.id ||
  null;

if (!blobId) {
  throw new Error("Walrus write succeeded but blobId was not found in SDK result");
}

return {
  blobId,
  blobObjectId
};

}

async function readMemoryFromWalrus(blobId) {
  const { client } = await getWalrusMainnet();

  const bytes = await client.walrus.readBlob({ blobId });
  const text = new TextDecoder().decode(bytes);

  return JSON.parse(text);
}

module.exports = {
  storeMemoryOnWalrus,
  readMemoryFromWalrus
};
