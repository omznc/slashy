import { Command, Guild } from "@prisma/client";

// A command caching system
class Cache {
  private cache = new Map<string, Guild & { commands: Command[] }>();

  public get(key: string): (Guild & { commands: Command[] }) | undefined {
    return this.cache.get(key);
  }

  public set(key: string, object: Guild & { commands: Command[] }): void {
    this.cache.set(key, object);
  }

  public remove(key: string): void {
    this.cache.delete(key);
  }
}

export const cache = new Cache();
