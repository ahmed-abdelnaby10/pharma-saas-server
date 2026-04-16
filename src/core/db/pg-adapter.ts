import { PrismaPg } from "@prisma/adapter-pg";

export type CreatePrismaPgOptions = {
  connectionString: string;
  /** Max connections in the node-postgres pool for this process (not Postgres max_connections). */
  poolMax: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
};

/**
 * Driver adapter with an explicit pool size so each API/worker process cannot open
 * an unbounded number of DB connections (helps avoid "too many clients" / P2037).
 */
export function createPrismaPgAdapter(
  options: CreatePrismaPgOptions,
): PrismaPg {
  const {
    connectionString,
    poolMax,
    idleTimeoutMillis = 30_000,
    connectionTimeoutMillis = 10_000,
  } = options;

  return new PrismaPg({
    connectionString,
    max: poolMax,
    idleTimeoutMillis,
    connectionTimeoutMillis,
  });
}
