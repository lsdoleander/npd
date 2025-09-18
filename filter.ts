
import * as stream from 'node:stream';
import { createWriteStream, type WriteStream } from 'node:fs';

export class CSVCommaSpaceEscaper extends stream.Transform {
  remain:string = "";
  errors:WriteStream
  suffix:string

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

  _transform(chunk: any, encoding: string, cb: Function) {

    // const header:string = "id,first,last,middle,suffix,dob,address,city,county,state,zip,phone,aka1,aka2,aka3,since,altdob1,altdob2,altdob3,ssn\n"

    this.remain += String(chunk);
    let idx:number = this.remain.lastIndexOf("\n");
    let filtered:string = this.remain.substr(0, idx+1);
    this.remain = this.remain.substr(idx + 1);

    try {
      let scrubbydub:string = filtered.replace(/((?:[^,\n]*,){12})(?:[^,\n]*,)*([^,\n]*,)(?:[^,\n]*,){2}([^,\n]*\n)/g, "$1$2$3")
      cb(null, scrubbydub);
    } catch (ex) {
      if (!this.errors)     this.errors = createWriteStream(`/data/errors_${this.suffix}.txt`, { flags: "a" });
      this.errors.write(filtered);
      cb(null,"");
    }

  }
}
