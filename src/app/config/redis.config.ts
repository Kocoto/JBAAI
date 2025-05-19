import IORedis, { RedisOptions, Redis } from "ioredis";

const host = process.env.REDIS_HOST || "localhost";
const port = parseInt(process.env.REDIS_PORT || "6379");

const isProduction = process.env.NODE_ENV === "production";
const redisUrl = isProduction
  ? process.env.REDIS_URL_PROD
  : process.env.REDIS_URL_DEV;

let redisConnection: Redis;
const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 2000);
    console.log(`[Redis] Retrying connection attempt ${times} in ${delay}ms`);
    return delay;
  },
};

try {
  if (!redisUrl) {
    throw new Error("REDIS_URL is not defined");
  }
  redisConnection = new IORedis(redisUrl, redisOptions);
} catch (error) {
  console.error(
    "[Redis] Failed to connect with URL. Falling back to local configuration."
  );
  redisConnection = new IORedis({
    ...redisOptions,
    host: host,
    port: port,
  });
}

redisConnection.on("connect", () => {
  console.log("[Redis] Connected to Redis");
});

redisConnection.on("ready", () => {
  console.log("[Redis] Redis is ready");
});
redisConnection.on("reconnecting", () => {
  console.log("[Redis] Reconnecting to Redis...");
});

redisConnection.on("error", (error) => {
  console.error("[Redis] Error connecting to Redis:", error);
});

export { redisConnection };
