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
