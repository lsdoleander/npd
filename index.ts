
import { pipeline } from 'node:stream/promises';
import { Pool, type PoolClient } from 'pg';
import { from } from 'pg-copy-streams';
import { config, type AppConfig } from './config';
import { createTableIfNotExists, createIndex } from './services';
import { createReadStream, createWriteStream, readdirSync, renameSync, type ReadStream, WriteStream } from 'node:fs';
import { CSVCommaSpaceEscaper } from './filter';

let last;

const csvPostgres = async (client: PoolClient, config: AppConfig, name:string): Promise<void> => {
  const tokens:Array<string> = name.match(/ssn(\d)\.(\d+)\.(\d+)*/);
  const suffix:string = `_${tokens[1]}_${tokens[2]}`;
  const table:string = config.table.name+suffix;

  if (last && last !== suffix) {
    await createIndex(client, config.table.name+last, last);
  }
  last = suffix;

  console.log("Processing file:", name);
  await createTableIfNotExists(client, config, table);
  const fileStream = createReadStream('/data/NPD/' + name, { highWaterMark: 64 * 1024  });
  const pgStream = client.query(from(`COPY ${table} (${config.table.csvColumns.join(',')}) FROM STDIN WITH (FORMAT csv, HEADER false)`));
  const filter = new CSVCommaSpaceEscaper(suffix);
  try {
    await pipeline(fileStream, filter, pgStream);
    console.info('CSV data copy completed successfully');
  } catch (error) {
    console.error('Error during copy:', error);
    throw error;
  }
};

const copyCsvToTable = async (client: PoolClient, config: AppConfig): Promise<void> => {

  async function file(name:string) {
    return new Promise<void>(async resolve=>{
      const startTime:number = new Date().getTime();

      await csvPostgres(client, config, name);
      renameSync('/data/NPD/' + name, '/data/finished/' + name);

      const durationSeconds:string = ((new Date().getTime() - startTime) / 1000).toFixed(2);
      console.info(`Imported ${name} in ${durationSeconds} seconds`);
      resolve();
    })
  }


  let data:Array<string> = readdirSync("/data/NPD");
  let done:boolean = false;
  data.sort();
  data.reverse();

  console.log("Files to process:", data.length);

  while (!done) {
    let fn:string = data.pop();
    if (fn) {
        await file(fn);
     } else {
      
      await createIndex(client, config.table.name+last, last);
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
    client.release();
    await pool.end();
  }
};

const main = async (): Promise<void> => {
  try {
    console.log("Build Version: Mega Venusaur")
    await new Promise<void>(async resolve=>{
      setTimeout(async function(){
        await importData(config);
        resolve();
      },30000)
    })

  } catch (error) {
    console.error('Application error:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, p) => { console.log("Unhandled reject:", reason, p) });
process.on('unhandledException', (ex) => { console.log("Unhandled error:", ex) });

main();