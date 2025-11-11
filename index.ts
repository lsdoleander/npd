
import { pipeline } from 'node:stream/promises';
import { Pool, type PoolClient } from 'pg';
import { from } from 'pg-copy-streams';
import { config, type AppConfig } from './config';
import { createTableIfNotExists, createIndex } from './services';
import { createReadStream, createWriteStream, readdirSync, renameSync, type ReadStream, WriteStream } from 'node:fs';
import * as es from 'event-stream';

let last = '_1_1';

const copyCsvToTable = async (client: PoolClient, config: AppConfig): Promise<void> => {

  async function file(name:string) {
    return new Promise<void>(async resolve=>{

    const tokens:Array<string> = name.match(/ssn(\d)\.(\d+)\.(\d+)*\.txt/);
    const suffix:string = `_${tokens[1]}_${tokens[2]}`;
    const temp:string = `temp${suffix}_${tokens[3]}`;
    const table:string = config.table.name+suffix;
    let errors:WriteStream;

    if (last !== suffix) {
      await createIndex(client, config.table.name+last, last);
    }
    last = suffix;

    console.info(`Copying CSV to temp table ${temp}`);
    await createTableIfNotExists(client, config, temp);

    const startTime:number = new Date().getTime();

    const VALUES:string = (()=>{
      let value:string = "$1";
      for (let i:number = 2; i <= 14; i++) {
        value += ", $" + i;
      }
      return value;
    })();

    const query:string = `INSERT INTO ${temp} (${config.table.csvColumns.join(',')}) VALUES (${VALUES})`;

    function columns(line:string) {
      let parts:Array<string> = line.split(",");
      let ssn:string = parts[parts.length - 1];
      
      if (/\d{9}/.test(ssn)) {
        let altdob1:string = parts[parts.length - 3];
        
        if (parts.length === 20 || /([A-Z]{2})?/.test(parts[9]) && /\d{5}(-\d{4})?/.test(parts[10]) && /(\d{10})?/.test(parts[11])){
          return { 
            name: "mass-insert",
            text: query,
            values: [ ...parts.slice(0,12), altdob1, ssn ]
          }
          
        } else if (/([A-Z]{2})?/.test(parts[10]) && /\d{5}(-\d{4})?/.test(parts[11]) && /(\d{10})?/.test(parts[12])){
          return { 
            name: "mass-insert",
            text: query,
            values: [ ...parts.slice(0,6), parts[6]+","+parts[7], parts.slice(8,13), altdob1, ssn ]
          }

        } else if (line.trim() !== ""){
          if (!errors) errors = createWriteStream(`/data/finished/errors_${suffix}.txt`, { flags: "a" });
          errors.write(line+"\n");
        }
      }
    }

    let count = 0;
    try {
      createReadStream('/data/NPD/' + name, {
        highWaterMark: 64 * 1024
      }).pipe(es.split()).pipe(es.mapSync(async function(line) {
        let insert = columns(line);
        if (insert) {
          count++;
          await client.query(insert);
          if (count % 1000000 === 0){
            console.log("inserted", count);
          }
        }
      })).on("end", async function(){

        if (errors) errors.close();
        renameSync('/data/NPD/' + name, '/data/finished/' + name);

        await createTableIfNotExists(client, config, table);
        await client.query(`INSERT INTO ${table} VALUES (SELECT * FROM ${temp})`);
        await client.query(`DROP TABLE ${temp}`);
        const durationSeconds:string = ((new Date().getTime() - startTime) / 1000).toFixed(2);
        console.info(`Imported ${name} in ${durationSeconds} seconds`);
        resolve();
        
      }).on("error", function(ex) {
         console.error(ex);
         resolve();
      });
    } catch(ex){
     console.error(ex);
     resolve();
    }
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
        console.log("Processing file:", fn);
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
    console.log("Build Version: Venusaur")
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