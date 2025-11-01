
import { pipeline } from 'node:stream/promises';
import { Pool, type PoolClient } from 'pg';
import { from } from 'pg-copy-streams';
import { config, type AppConfig } from './config';
import { createTableIfNotExists, createIndex } from './services';
import { createReadStream, readdirSync, renameSync, type ReadStream } from 'node:fs';

const copyCsvToTable = async (client: PoolClient, config: AppConfig): Promise<void> => {
  console.info(`Copying CSV to table ${config.table.name}`);

  async function file(name:string) {
    let suffix:string = name.replace(/ssn(\d)\.(\d+)(?:\.\d+)*\.txt/, '_$1_$2');
    let table:string = config.table.name+suffix;
    let errors:WriteStream;

    const startTime = Date.now();
  
    function columns(line:string) {
      let parts:Array<string> = line.split(",");
      let ssn:string = parts[parts.length - 1];
      
      if (/\d{9}/.test(ssn)) {
        let altdob1:string = parts[parts.length - 4];
        
        if (parts.length === 20 || /([A-Z]{2})?/.test(parts[9]) && /\d{5}(-\d{4})?/.test(parts[10]) && /(\d{10})?/.test(parts[11])){
          return [ ...parts.slice(0,11), altdob1, ssn ];
          
        } else if (/([A-Z]{2})?/.test(parts[10]) && /\d{5}(-\d{4})?/.test(parts[11]) && /(\d{10})?/.test(parts[12])){
          return [ ...parts.slice(0,5), parts[6]+","+parts[7], parts.slice(8,12), altdob1, ssn ];

        } else if (line.trim() !== ""){
          if (!errors) errors = createWriteStream(`/data/finished/errors_${suffix}.txt`, { flags: "a" });
          errors.write(line+"\n");
        }
      }
    }

    try {
      client.query("BEGIN");
      await createTableIfNotExists(client, config, table);
      await createIndex(client, table, suffix);
      const VALUES:string = (()=>{
        let value:string = "$1";
        for (let i:number = 2; i <= 14; i++) {
          value += ", $" + i;
        }
        return value;
      })();

      const query:string = `INSERT INTO ${table} (${config.table.csvColumns.join(',')}) VALUES (${VALUES})`;

      const fileStream:ReadStream = createReadStream('/data/NPD/' + name, {
        highWaterMark: 64 * 1024, // 64KB chunks
      });

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        let insert:Array<string> = columns(line);
        if (insert) {
          client.query(query, insert);
        }
      }

      if (errors) errors.close();
      renameSync('/data/NPD/' + name, '/data/finished/' + name);
      client.query("COMMIT");

      const durationSeconds:string = ((Date.now() - startTime) / 1000).toFixed(2);
      console.info(`Imported ${name} in ${durationSeconds} seconds`);

    } catch(ex) {
      console.error(ex);
      client.query("ROLLBACK");
      console.info(`Rollback ${name} after ${durationSeconds} seconds`);
    }
  }


  let data:Array<string> = readdirSync("/data/NPD");
  let done:boolean = false;
  data.sort();
  data.reverse();

  console.log("Files to process:", data.length);

  while (!done) {
    let fn:string = data.pop();
    if (fn) {
        console.log("Processing file:", fn);
        await file(fn);
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