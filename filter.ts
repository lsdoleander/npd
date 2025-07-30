
import * as stream from 'node:stream';
import { createWriteStream, type WriteStream } from 'node:fs';

export class CSVCommaSpaceEscaper extends stream.Transform {
  remain:string = "";
  errors:WriteStream = createWriteStream("/data/errors.txt", { flags: "a" });

  constructor(){
    super()

    this.on("close", ()=>{
      if (this.errors) {
        this.errors.close()
        this.errors = null
      }
    })
  }

  _transform(chunk: any, encoding: string, cb: Function) {
    this.remain += String(chunk);
    let idx:number = this.remain.lastIndexOf("\n");
    let filtered:string = this.remain.substr(0, idx+1).replace(/, /g, ";");
    let check = true;
    while(check) {
      let matches = filtered.match(/(?:[^,\r\n]*,){20,25}[^,\r\n]+\r?\n/);
      if (!matches) matches = filtered.match(/(\r?\n)(?:[^,\r\n]*,){15,18}[^,\r\n]+\r?\n/);
      if (!matches) matches = filtered.match(/^(?:[^,\r\n]*,){15,18}[^,\r\n]+\r?\n/);
      if (matches) {
        let remove = matches[0];
        filtered = filtered.replace(remove, matches.length > 1 ? matches[1]: "");
        this.errors.write(remove);
      } else {
        check = false;
      }
    }
    
    this.remain = this.remain.substr(idx + 1);
    cb(null, filtered);
  }
}
