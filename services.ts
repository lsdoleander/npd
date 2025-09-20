import { type PoolClient } from 'pg';
import type { AppConfig } from './config';

export const createTableIfNotExists = async (client: PoolClient, config: AppConfig, table: string): Promise<void> => {
  const columnDefinitions:string = Object.entries(config.table.columns)
    .map(([name, type]) => `${name} ${type}`)
    .join(', ');

  await client.query(`CREATE TABLE IF NOT EXISTS ${table} (${columnDefinitions})`);
};

export const createIndex = async (client: PoolClient, table: string, suffix: string): Promise<void> => {
  await client.query(`DROP INDEX IF EXISTS index_name_by_location_${suffix}`);
  await client.query(`CREATE INDEX IF NOT EXISTS npd${suffix}_search_index ON ${table} (first, last, city, state, zip, ssn) INCLUDE (id, middle, suffix, dob, address, phone, altdob1)`)
}

export const refactorIndices = async(client: PoolClient): Promise<void> => {
    const LAYOUT = { "0": 1, "1":68, "2":27 }; //40
    for (let spa in LAYOUT) {
      for (let spb = 1; spb <= LAYOUT[spa]; spb++) {
        const suffix = `_${spa}_${spb < 10 ? "0"+spb : spb}`;
        await createIndex(client, "npd"+suffix, suffix);
      }
    }
}