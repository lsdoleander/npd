export type DatabaseConfig = {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
};

export type TableConfig = {
  name: string;
  columns: Record<string, string>;
  csvColumns: string[];
};

export type AppConfig = {
  database: DatabaseConfig;
  table: TableConfig;
};

export const config: AppConfig = {

  database: {
    user: 'postgres',
    host: 'db',
    database: 'npd',
    password: 'postgres',
    port: 5432,
  },

  table: {
    name: 'NPD',
    columns: {
      id: "INTEGER",
      first: "TEXT",
      last: "TEXT",
      middle: "TEXT",
      suffix: "TEXT",
      dob: "TEXT",
      address: "TEXT",
      city: "TEXT",
      county: "TEXT",
      state: "TEXT",
      zip: "TEXT",
      phone: "TEXT",
      aka1: "TEXT",
      aka2: "TEXT",
      aka3: "TEXT",
      since: "TEXT",
      altdob1: "TEXT",
      altdob2: "TEXT",
      altdob3: "TEXT",
      ssn: "TEXT"
    },

    csvColumns: ['id','first','last','middle','suffix','dob','address','city','county',
      'state','zip','phone','aka1','aka2','aka3','since','altdob1','altdob2','altdob3','ssn']
  }
};