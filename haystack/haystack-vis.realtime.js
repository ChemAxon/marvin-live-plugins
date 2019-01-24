/*!
 * haystack Postgres Cartridge plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const { Pool } = require("pg");


//"postgres://username:password@server:port/database";
const connectionString = process.env["CONNECTIONSTRING"];


const pool = new Pool({
    connectionString,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});


const searchQueries = {
	"Exact match": "SELECT id FROM master WHERE $1::Molecule('haystack') |=| molecule LIMIT 100;",
	"Substructure": "SELECT id FROM master WHERE $1::Molecule('haystack') |<| molecule ORDER BY molecule LIMIT 100;",
	"Similarity": "SELECT id FROM master WHERE row($1::Molecule('haystack'), 0.8)::sim_order |<~| molecule LIMIT 100;"
};


const metadataQuery = `SELECT * FROM master WHERE id = ANY($1::int[])`;


async function sqlSearch(type, queryMolecule) {

	const client = await pool.connect();

	const queryStart = +new Date();
	const searchQuery = searchQueries[type];

	try {
  	const results = await client.query(searchQuery, [queryMolecule]);
		if (+new Date() - queryStart > 2000) {
			console.log("Slow PG SELECT (%s ms)", (+new Date() - queryStart));
			console.log(searchQuery);
		}
		return _.map(results.rows, (row) => row.id);
	} finally {
		client.release();
	}

}

async function search(type, query) {
	return sqlSearch(type, query);
}


async function retrieveData(ids) {

	const client = await pool.connect();

	const queryStart = +new Date();
	try {
  	const results = await client.query(metadataQuery, [ids]);
		if (+new Date() - queryStart > 2000) {
			console.log("Slow PG retrieve (%s ms)", (+new Date() - queryStart));
			console.log(ids);
		}
		return results.rows;
	} finally {
		client.release();
	}

}


async function update(mrvSource) {

	const startTime = +new Date();
	const times = [startTime];

	const searchType = this.settings && this.settings["Search type"] || "Substructure";

	const ids = await search(searchType, mrvSource);
	times.push(+new Date());

	const rows = await retrieveData(ids);
	times.push(+new Date());


	const bindingdbCount = _.filter(rows, (row) => !!row.bindingdb).length;
	const chemblCount = _.filter(rows, (row) => !!row.chembl).length;
	const emoleculesCount = _.filter(rows, (row) => !!row.emolecules).length;
	// const fda_srsCount = _.filter(rows, (row) => !!row.fda_srs).length;
	// const mculeCount = _.filter(rows, (row) => !!row.mcule).length;
	// const molport_allstockCount = _.filter(rows, (row) => !!row.molport_allstock).length;
	// const molport_madetoorderCount = _.filter(rows, (row) => !!row.molport_madetoorder).length;
	// const namikiCount = _.filter(rows, (row) => !!row.namiki).length;
	const pubchemCount = _.filter(rows, (row) => !!row.pubchem).length;
	// const surechemblCount = _.filter(rows, (row) => !!row.surechembl).length;
	// const zincCount = _.filter(rows, (row) => !!row.zinc).length;

	// const chartData = [bindingdbCount, chemblCount, emoleculesCount, fda_srsCount, mculeCount, molport_allstockCount, molport_madetoorderCount, namikiCount, pubchemCount, surechemblCount, zincCount];
	const chartData = [bindingdbCount, chemblCount, emoleculesCount, pubchemCount];

	const durations = [times[1] - times[0], times[2] - times[1]];
	console.log("haystack-vis tooks", durations);

	return {
		client: {
			//labels: ["BindingDB", "ChEMBL", "eMolecules", "FDA SRS", "mcule", "Molport (stock)", "Molport (order)", "Namiki", "Pubchem", "SureChEMBL", "ZINC"],
			labels: ["BindingDB", "ChEMBL", "eMolecules", "Pubchem"],
			data: chartData,
			options: {
				scales: {
					xAxes: [{
			      ticks: {
			        autoSkip: false
			      }
			    }],
					yAxes: [{
            display: true,
            ticks: {
							min: 0,
              stepSize: _.max(chartData) < 10 ? 10 : 10
            }
        	}]
				}
			}
		},
		report: {}
	};

}


//export the necessary plugin properties
module.exports = {
	name: "haystack-vis",
	label: "Result distribution",
	docs: "Fetches the first 100 results to your query and counts how many are in the given databases. Search setup is (unfortunately) independent from the Project Haystack plugin. Working on it...",
	templateFile: "haystack-vis.template.html",
	update: update,
	domains: ["internal"],
	sortOrder: 170,
	settings: [{
		label: "Search type",
		type: "enum",
		default: "Substructure",
		values: ["Substructure", "Exact match", "Similarity"]
	}]
};