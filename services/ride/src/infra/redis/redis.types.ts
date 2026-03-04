export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export type RedisClient = import('ioredis').Redis;
