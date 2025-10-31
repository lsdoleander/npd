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

export const config: AppConfig = (function(){

  let c = {
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
        id: "INTEGER", // 0
        first: "TEXT",
        last: "TEXT",
        middle: "TEXT",
        suffix: "TEXT",
        dob: "TEXT",
        address: "TEXT", // 6
        city: "TEXT",
        county: "TEXT",
        state: "TEXT",  // 9
        zip: "TEXT",    // 10
        phone: "TEXT",  // 11
/*      aka1: "TEXT",
        aka2: "TEXT",
        aka3: "TEXT",
        since: "TEXT",*/
        altdob1: "TEXT", // 16
/*      altdob2: "TEXT",
        altdob3: "TEXT",*/
        ssn: "TEXT" // 19
      },

      csvColumns: []
    }
  }

  for (let key in c.table.columns) {
    c.table.csvColumns.push(key);
  }

  return c;
})();