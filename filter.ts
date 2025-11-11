
import * as stream from 'node:stream';
import { createWriteStream, type WriteStream } from 'node:fs';


export class CSVCommaSpaceEscaper extends stream.Transform {
  remain:string = "";
  suffix:string
  errors:WriteStream

  constructor(suffix){
    super()
    this.suffix = suffix
    this.on("close", ()=>{
      if (this.errors) {
        this.errors.close()
        this.errors = null
      }
    })
  }

  columns(line:string) {
    let parts:Array<string> = line.split(",");
    let ssn:string = parts[parts.length - 1];
    
    if (/\d{9}/.test(ssn)) {
      let altdob1:string = parts[parts.length - 3];
      let since:string = parts[parts.length - 4];
      
      if (parts.length === 20 || /([A-Z]{2})?/.test(parts[9]) && /\d{5}(-\d{4})?/.test(parts[10]) && /(\d{10})?/.test(parts[11])){
        return [ ...parts.slice(0,12), since, altdob1, ssn ]
       
      } else if (/([A-Z]{2})?/.test(parts[10]) && /\d{5}(-\d{4})?/.test(parts[11]) && /(\d{10})?/.test(parts[12])){
        return [ ...parts.slice(0,6), '"'+parts[6]+","+parts[7]+'"', parts.slice(8,13), since, altdob1, ssn ]

      } else if (line.trim() !== ""){
        if (!this.errors) this.errors = createWriteStream(`/data/finished/errors_${this.suffix}.txt`, { flags: "a" });
        this.errors.write(line+"\n");
      }
    }
  }

  _transform(line: any, encoding: string, cb: Function) {
    
    this.remain += String(line);
    let idx:number = this.remain.lastIndexOf("\n");
    let filtered:string = this.remain.substr(0, idx+1);
    this.remain = this.remain.substr(idx + 1);

    try {
      let joins = [];
      for (const line of filtered.split('\n')){
        let cols = this.columns(line);
        if (cols) joins.push(cols.join(","))
      }

      cb(null, joins.join("\n")+"\n");
    } catch (ex) {
      console.warn (ex);
      if (!this.errors) this.errors = createWriteStream(`/data/finished/errors_${this.suffix}.txt`, { flags: "a" });
      this.errors.write(filtered);
      cb(null,"");
    }

  }
}