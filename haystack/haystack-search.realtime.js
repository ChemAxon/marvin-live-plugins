/*!
 * haystack Postgres Cartridge plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");
const { Pool } = require("pg");


//"postgres://username:password@server:port/database";
const connectionString = process.env["CONNECTIONSTRING"];


const pool = new Pool({
    connectionString,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});


const searchQueries = {
	"Exact match": "SELECT id FROM master WHERE $1::Molecule('haystack') |=| molecule LIMIT 20;",
	"Substructure": "SELECT id FROM master WHERE $1::Molecule('haystack') |<| molecule ORDER BY molecule LIMIT 20;",
	"Similarity": "SELECT id FROM master WHERE row($1::Molecule('haystack'), 0.8)::sim_order |<~| molecule LIMIT 20;"
};


const metadataQuery = `SELECT * FROM master WHERE id = ANY($1::int[]);`;


const databaseBaseURLs = {
	bindingdb: "https://www.bindingdb.org/bind/chemsearch/marvin/MolStructure.jsp?monomerid={{id}}",
	chembl: "https://www.ebi.ac.uk/chembldb/compound/inspect/{{id}}",
	emolecules: "https://www.emolecules.com/search/#?query={{id}}",
	mcule: "https://mcule.com/{{id}}",
	fda_srs: "https://fdasis.nlm.nih.gov/srs/ProxyServlet?mergeData=true&objectHandle=DBMaint&APPLICATION_NAME=fdasrs&actionHandle=default&nextPage=jsp/srs/ResultScreen.jsp&TXTSUPERLISTID={{id}}",
	molport_allstock: "https://www.molport.com/shop/molecule-link/{{id}}",
	molport_madetoorder: "https://www.molport.com/shop/molecule-link/{{id}}",
	pubchem: "https://pubchem.ncbi.nlm.nih.gov/compound/{{id}}",
	surechembl: "https://www.surechembl.org/chemical/{{id}}",
	zinc: "https://zinc15.docking.org/substances/{{id}}"
};


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


//using the above map, tries to create a compound url specific to a source database
//if source is not available, an empty string is returned
function getDatabaseCompoundURL(source, id) {
  const _source = source && source.toLowerCase();
  if (databaseBaseURLs[_source]) {
    return databaseBaseURLs[_source].replace("{{id}}", id);
  } else {
    return "";
  }
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

	const metadata = await retrieveData(ids);
	times.push(+new Date());

	const rows = _.sortBy(metadata, (row) => ids.indexOf(row.id));

	const images = await mlutils.getImageURLs(_.map(rows, (row) => row.molecule));
	times.push(+new Date());

	_.each(images, (image, index) => {
		rows[index].base64image = image;
	});


	const sources = ["bindingdb", "chembl", "emolecules", "fda_srs", "mcule", "molport_allstock", "molport_madetoorder", "namiki", "pubchem", "surechembl", "zinc"];
	_.map(rows, (row) => {
		_.each(sources, (source) => {
			if (row[`${source}`]) {
				row[`${source}_link`] = getDatabaseCompoundURL(source, row[`${source}`]);
			}
		});

		return row;
	});


	const durations = [];
	_.each(times, (timing, index) => {
		if (index === 0) {
			return;
		}
		durations.push(timing - times[index - 1]);
	});
	console.log("haystack-sub took", durations);

	return {
		client: {
			rows: rows,
			timing: {
				times: durations,
				total: _.sum(durations),
				parts: _.map(durations, (timing) => 100 * timing / Math.max(2000, _.sum(durations)))
			}
		},
		report: {}
	};

}


//export the necessary plugin properties
module.exports = {
	name: "haystack-search",
	label: "Project Haystack",
	templateFile: "haystack-search.template.html",
	docs: "Runs a chemical structure search and fetches the first 20 results. To show off the technology a bit, 3 main components of the plugin's work are timed. Search duration means substructure/similarity/exact match search with screening and atom-by-atom search. Retrieving metadata means fetching remote database IDs and molecule sources for each hit. Image generation means creating PNG and cleaning the molecule to 2D some content sources.",
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