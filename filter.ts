
import * as stream from 'node:stream';
import { createWriteStream, type WriteStream } from 'node:fs';

export class CSVCommaSpaceEscaper extends stream.Transform {
  remain:string = "";
  errors:WriteStream
  debug:WriteStream
  dwrites:number
  headfix:boolean

  constructor(suffix){
    super()
    this.errors = createWriteStream(`/data/errors${suffix}.txt`, { flags: "a" });
    this.debug = createWriteStream(`/data/debug${suffix}.txt`, { flags: "a" });
    this.dwrites = 0;
    this.on("close", ()=>{
      if (this.errors) {
        this.errors.close()
        this.errors = null
      }
    })
  }

  _transform(chunk: any, encoding: string, cb: Function) {

    // const header:string = "id,first,last,middle,suffix,dob,address,city,county,state,zip,phone,aka1,aka2,aka3,since,altdob1,altdob2,altdob3,ssn\n"

    this.remain += String(chunk);
    let idx:number = this.remain.lastIndexOf("\n");
    let filtered:string = this.remain.substr(0, idx+1);//.replace(/, /g, ";");
    this.remain = this.remain.substr(idx + 1);

    try {
      let scrubbydub:string = filtered.replace(/((?:[^,\n]*,){12})(?:[^,\n]*,)*([^,\n]*\n)/g, "$1$2")
      if (dwrites < 5) {
        debug.write(scrubbydub);
        dwrites++
      } else {
        debug.close();
      }
      cb(null, scrubbydub);
    } catch (ex) {
      this.errors.write(filtered);
      cb(null,"");
    }

    /*
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
    }*/

  }
}
