require("dotenv").config();

async function getMemWalClient() {
  const { MemWal } = await import("@mysten-incubation/memwal");

  const privateKey = process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  const serverUrl =
    process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz";

  if (!privateKey) throw new Error("MEMWAL_PRIVATE_KEY missing");
  if (!accountId) throw new Error("MEMWAL_ACCOUNT_ID missing");

  return MemWal.create({
    key: privateKey,
    accountId: accountId,
    serverUrl: serverUrl
  });
}

async function storeMemoryOnMemWal(memory) {
  const memwal = await getMemWalClient();

  const text = JSON.stringify({
    project: "The 12th Memory",
    type: "world_cup_fan_memory",
    createdAt: new Date().toISOString(),
    memory: memory
  });

  const job = await memwal.remember(text);
  console.log("MEMWAL REMEMBER JOB:", job);

  let result = job;

  if (job && job.job_id && typeof memwal.waitForRememberJob === "function") {
    result = await memwal.waitForRememberJob(job.job_id);
  }

  console.log("MEMWAL FINAL RESULT:", result);

  const blobId =
    (result && result.blob_id) ||
    (result && result.blobId) ||
    (job && job.blob_id) ||
    (job && job.blobId) ||
    null;

  const jobId =
    (result && result.job_id) ||
    (result && result.jobId) ||
    (job && job.job_id) ||
    (job && job.jobId) ||
    null;

  return {
    success: true,
    blobId: blobId,
    jobId: jobId,
    explorerUrl: blobId
      ? "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/" + blobId
      : null,
    rawResult: result
  };
}

module.exports = {
  storeMemoryOnMemWal
};
