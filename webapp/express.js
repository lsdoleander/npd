import ws from 'express-ws';
import express from 'express';
import cors from 'cors';
import postgres from 'postgres';
import { series } from 'async'
import { stringify } from 'csv-stringify/sync'

(function start(){

	const sql = postgres('postgres://postgres:postgres@db:5432/npd')

	const LAYOUT = { "0": 1, "1":68, "2":27 }; //40

	let app = express();
	app.use(cors());
	app.use(express.static('www'))
	ws(app);

	app.ws("/search", function(ws, req) {
		let status = {
			done: 0,
			total: LAYOUT["1"]+LAYOUT["2"]+1,
			hits: 0
		}
		let results = [];
		let queue = [];

		ws.on("message", m=>{
			let data = JSON.parse(m);
			for (let spa in LAYOUT) {
				for (let spb = 1; spb <= LAYOUT[spa]; spb++) {
					(function search(table, { first, last, city, state, zip, ssn }){
						queue.push(function(cb){
							(async()=>{try {
								let _where_ = false;
								let where = function(){
									let value = _where_ ? "AND" : "WHERE";
									_where_ = true;
									return value;
								}

								const hits = await sql`select id, first, middle, last, suffix, address, city, state, zip, phone, dob, altdob1, ssn
								 	from ${ sql(table) }${
									first ? sql` ${where()} first = ${ first }` : sql``}${
									last ? sql` ${where()} last = ${ last }` : sql``}${
									city ? sql` ${where()} city = ${ city }` : sql``}${
									state ? sql` ${where()} state = ${ state }` : sql``}${
									zip ? sql` ${where()} zip = ${ zip }` : sql``}${
									ssn ? sql` ${where()} ssn = ${ ssn }` : sql``}`
								
								if (hits && hits.length > 0) {
									status.hits += hits.length;
									ws.send(JSON.stringify({
										status,
										hits,
										final: false
									}))
									results = [...results, ...hits];
									setTimeout(cb,0)
								}
							} catch (ex) {
								console.log(ex);
								cb();
							}})()
						})
					})(`npd_${spa}_${spb < 10 ? "0"+spb : spb}`, data);
				}
			}
			series(queue, function(){
				ws.send(JSON.stringify({
					csv: btoa(stringify(results, { header: true })),
					final: true;
				}))
			})
		})

	})

	app.listen(8989);
})()
