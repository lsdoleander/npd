import { type PoolClient } from 'pg';
import type { AppConfig } from './config';

export const createTableIfNotExists = async (client: PoolClient, config: AppConfig, table: string): Promise<void> => {
  const columnDefinitions:string = Object.entries(config.table.columns)
    .map(([name, type]) => `${name} ${type}`)
    .join(', ');

  await client.query(`CREATE TABLE IF NOT EXISTS ${table} (${columnDefinitions})`);
};

export const createIndex = async (client: PoolClient, table: string, suffix: string): Promise<void> => {
  await client.query(`CREATE INDEX index_name_by_location_${suffix} ON ${table} (first, last, city, state, zip) INCLUDE (middle, dob, address, county, phone, since, ssn)`)
}