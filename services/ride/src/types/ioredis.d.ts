declare module 'ioredis' {
  export interface Redis {
    [key: string]: (...args: any[]) => any;
  }

  const RedisCtor: {
    new (...args: any[]): Redis;
  };

  export default RedisCtor;
}
