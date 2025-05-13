import IORedis, { RedisOptions } from "ioredis";

const host = process.env.REDIS_HOST || "localhost";
const port = parseInt(process.env.REDIS_PORT || "6379");

const redisOptions: RedisOptions = {
  host: host,
  port: port,
};

const redisConnection = new IORedis(redisOptions);

redisConnection.on("connect", () => {
  console.log("[Redis] Connected to Redis");
});

redisConnection.on("error", (error) => {
  console.error("[Redis] Error connecting to Redis:", error);
});

export { redisConnection, redisOptions };
