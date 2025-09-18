
import express from 'express';
import cors from 'cors';
import postgres from 'postgres';

(function start(){

	const sql = postgres('postgres://postgres:postgres@db:5432/npd')

	const LAYOUT = { "1":68, "2":40 };

	let app = express();
	app.use(cors());
	app.use(express.static('www'))

	app.post("/search", async (req,res)=>{
		let results = [];

		for (let spa in LAYOUT) {
			for (let spb = 1; spb <= LAYOUT[spa]; spb++) {
				try {
					let _where_ = false;
					let where = function(){
						let value = _where_ ? "AND" : "WHERE";
						_where_ = true;
						return value;
					}

					const table = `npd_${spa}_${spb < 10 ? "0"+spb : spb}`;
					const hits = await sql`select id, first, middle, last, suffix, address, city, state, zip, phone, dob, altdob1, ssn
					 from ${ sql(table) }${
						first ? sql` ${where()} first = ${ first }` : sql``}${
						last ? sql` ${where()} last = ${ last }` : sql``}${
						city ? sql` ${where()} city = ${ city }` : sql``}${
						state ? sql` ${where()} state = ${ state }` : sql``}${
						zip ? sql` ${where()} zip = ${ zip }` : sql``}${
						ssn ? sql` ${where()} ssn = ${ ssn }` : sql``}`
					if (hits && hits.length > 0) {
						results = [...results, ...hits];
					}
				} catch (ex) {
					console.log(ex);
				}
			}
		}

		res.json(results);
	})

	app.listen(8989);
})()
