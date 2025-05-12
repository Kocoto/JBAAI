import IORedis, { RedisOptions } from "ioredis";

const redisOptions: RedisOptions = {
  host: "localhost",
  port: 6379,
};

const redisConnection = new IORedis(redisOptions);

redisConnection.on("connect", () => {
  console.log("Connected to Redis");
});

redisConnection.on("error", (error) => {
  console.error("Redis connection error:", error);
});

export { redisConnection, redisOptions };
