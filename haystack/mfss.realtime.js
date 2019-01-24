/*!
 * ChemAxon Madfast Similarity Search plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

var Q = require("q");
var _ = require("lodash-node");
var mlutils = require("./ml-utils");

var server = "http://haystack.bph.cxn:8087/";

const { Pool } = require("pg");

//"postgres://username:password@server:port/database";
const connectionString = process.env["CONNECTIONSTRING"];

const metadataQuery = `SELECT * FROM master WHERE id = ANY($1::int[]);`;

const pool = new Pool({
	connectionString,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
});


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
const sources = ["bindingdb", "chembl", "emolecules", "fda_srs", "mcule", "molport_allstock", "molport_madetoorder", "namiki", "pubchem", "surechembl", "zinc"];


async function searchIDs(mrvSource){
	const results = await mlutils.post({
		url: server + "rest/descriptors/master-ecfp4/find-most-similars",
		form: {
			query: mrvSource,
			"max-count": 20
		},
		json: true
	});
	const ids = _.map(results.targets, (target) => parseInt(target.targetid, 10));
	const similarityScores = _.map(results.targets, (target) => (1 - target.dissimilarity));

	return {ids, similarityScores};
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


async function update(mrvSource) {

	const {ids, similarityScores} = await searchIDs(mrvSource);

	const metadata = await retrieveData(ids);
	const rows = _.sortBy(metadata, (row) => ids.indexOf(row.id));

	_.each(rows, (row, index) => {
		row.similarityScore = similarityScores[index];
	});

	const images = await mlutils.getImageURLs(_.map(rows, (row) => row.molecule));

	_.each(images, (image, index) => {
			rows[index].base64image = image;
	});

	_.map(rows, (row) => {
		_.each(sources, (source) => {
			if (row[`${source}`]) {
				row[`${source}_link`] = getDatabaseCompoundURL(source, row[`${source}`]);
			}
		});
		return row;
	});

	return {
		client: {
			rows: rows,
		},
		report: {}
	};
}


module.exports = {
	name: "mfss",
	label: "Most similar (ECFP-4) structures",
	update: update,
	templateFile: "mfss.template.html",
	domains: ["*"],
	sortOrder: 35
};
