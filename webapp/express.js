
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
			for (const spb = 1; spb <= LAYOUT[spa]; spb++) {
				try {
					let where = false;

					function param(name) {
						if (req.params[name] && req.params[name].trim() !== "") {
							const value = req.params[name];
							const like = value.indexOf("%") > -1;
							let out = sql`${where?"AND":"WHERE"} ${name} ${like ? "LIKE":"="} ${value}`
							where = true
							return out
						}
					}

					const table = `npd_${spa}_${spb < 10 ? "0"+spb : spb}`;
					const hits = await sql`select (first, middle, last, address, city, state, zip, phone, dob, ssn, since from ${table} 
						${param('first')} ${param('last')} ${param('city')} ${param('state')} ${param('zip')}`
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
