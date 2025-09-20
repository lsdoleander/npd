import { type PoolClient } from 'pg';
import type { AppConfig } from './config';

export const createTableIfNotExists = async (client: PoolClient, config: AppConfig, table: string): Promise<void> => {
  const columnDefinitions:string = Object.entries(config.table.columns)
    .map(([name, type]) => `${name} ${type}`)
    .join(', ');

  await client.query(`CREATE TABLE IF NOT EXISTS ${table} (${columnDefinitions})`);
};

export const createIndex = async (client: PoolClient, table: string, suffix: string): Promise<void> => {
  await client.query(`CREATE INDEX IF NOT EXISTS npd${suffix}_search_index ON ${table} (first, last, city, state, zip) INCLUDE (id, middle, suffix, address, phone, dob, altdob1, ssn)`)
  console.log(`created npd${suffix}_search_index`)
  await client.query(`CREATE INDEX IF NOT EXISTS npd${suffix}_reverse_ssn ON ${table} (ssn) INCLUDE (id, first, last, middle, suffix, address, city, state, zip, phone, dob, altdob1)`)
  console.log(`created npd${suffix}_reverse_ssn`)
}

export const refactorIndices = async(client: PoolClient): Promise<void> => {
    const LAYOUT = { "0": 1, "1":68, "2":27 }; //40
    for (let spa in LAYOUT) {
      for (let spb = 1; spb <= LAYOUT[spa]; spb++) {
        const suffix = `_${spa}_${spb < 10 ? "0"+spb : spb}`;
        await client.query(`DROP INDEX IF EXISTS index_name_by_location_${suffix}`);
        console.log(`dropped index_name_by_location_${suffix}`)
        await client.query(`ALTER TABLE npd${suffix} DROP COLUMN IF EXISTS aka1, DROP COLUMN IF EXISTS aka2, DROP COLUMN IF EXISTS aka3, DROP COLUMN IF EXISTS since, DROP COLUMN IF EXISTS altdob2, DROP COLUMN IF EXISTS altdob3`);
        console.log(`altered npd${suffix}`)
        await createIndex(client, "npd"+suffix, suffix);
      }
    }
}