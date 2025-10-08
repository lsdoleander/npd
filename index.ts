
import { pipeline } from 'node:stream/promises';
import { Pool, type PoolClient } from 'pg';
import { from } from 'pg-copy-streams';
import { config, type AppConfig } from './config';
import { createTableIfNotExists, createIndex, refactorIndices } from './services';
import { createReadStream, readdirSync, renameSync, type ReadStream } from 'node:fs';
import { CSVCommaSpaceEscaper } from './filter';

const copyCsvToTable = async (client: PoolClient, config: AppConfig): Promise<void> => {
  console.info(`Copying CSV to table ${config.table.name}`);

  async function file(name:string, header:boolean) {
    let suffix:string = name.replace(/ssn(\d)\.(\d+)(?:\.\d+)*\.txt/, '_$1_$2');
    let table:string = config.table.name+suffix;

    try {
      await createTableIfNotExists(client, config, table);
      const fileStream:ReadStream = createReadStream('/data/' + name, {
        highWaterMark: 64 * 1024, // 512KB chunks for better performance
      });
      const pgStream = client.query(from(`COPY ${table} (${config.table.csvColumns.join(',')})`+
       ` FROM STDIN WITH (FORMAT csv, HEADER ${header}, ON_ERROR ignore, LOG_VERBOSITY verbose)`));
      const csvFilter = new CSVCommaSpaceEscaper(name);
      await pipeline(fileStream, csvFilter, pgStream);
      console.info(`Copied ${name} to table: ${table}`);
      await createIndex(client, table, suffix);
      console.info(`Created Index for table: ${table}`);
      renameSync('/data/' + name, '/done/' + name);
    } catch (error) {
      console.error('Error during copy:', error);
      throw error;
    }
  }


  let data:Array<string> = readdirSync("/data/");
  let done:boolean = false;
  data.sort();
  data.reverse();

  console.log("Files to process:", data.length);

  while (!done) {
    let fn:string = data.pop();
    if (fn) {
      if (fn !== "errors.txt") {
        console.log("Processing file:", fn);
        await file(fn, fn === "ssn1.01.txt");
      }
    } else {
      done = true;
    }
  }
};

export const importData = async (config: AppConfig): Promise<void> => {
  const pool = new Pool(config.database);
  const client = await pool.connect();
  const startTime = Date.now();
  console.info('Import process started');

  try {
    await copyCsvToTable(client, config);
  } finally {
    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.info(`Import completed in ${durationSeconds} seconds`);
    client.release();
    await pool.end();
  }
};

const main = async (): Promise<void> => {
  try {
    await importData(config);

  } catch (error) {
    console.error('Application error:', error);
    process.exit(1);
  }
};

main();