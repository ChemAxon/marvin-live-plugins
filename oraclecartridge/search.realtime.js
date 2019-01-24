/*!
 * haystack Postgres Cartridge plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");
const oracledb = require("oracledb");
oracledb.outFormat = oracledb.OBJECT;
oracledb.fetchAsString = [ oracledb.CLOB ];
oracledb.fetchAsBuffer = [ oracledb.BLOB ];

//"jcb-oracle15.bpo.cxn:35001/tajcb";
const connectionString = process.env["ORACLE_CONNECTSTRING"];
const credentials = {
	user: process.env["ORACLE_USER"],
	password: process.env["ORACLE_PASSWORD"]
};

const poolPromise = oracledb.createPool({
    user: credentials.user,
    password: credentials.password,
    connectString: connectionString
});

const searchQueries = {
	"Exact match": "SELECT MOLECULE FROM tab WHERE jc_compare(molecule, :querymol, 't:d') = 1 AND ROWNUM <= 20",
	"Substructure": "SELECT MOLECULE FROM tab WHERE jc_compare(molecule, :querymol, 't:s') = 1 AND ROWNUM <= 20",
	"Similarity": "SELECT MOLECULE FROM tab WHERE jc_tanimoto(molecule, :querymol) > 0.8 AND ROWNUM <= 20"
};

async function sqlSearch(type, queryMol) {

	const pool = await poolPromise;

	const queryStart = +new Date();
	const searchQuery = searchQueries[type];

	const connection = await pool.getConnection();
	try {
		const result = await connection.execute(searchQuery, {
			queryMol
		});
		if (+new Date() - queryStart > 2000) {
			console.log("Slow SELECT (%s ms)", (+new Date() - queryStart));
			console.log(searchQuery);
		}
		return result.rows;
	} finally {
		connection.close();
	}

}

async function search(type, query) {
	return sqlSearch(type, query);
}


async function update(mrvSource) {


	const searchType = this.settings && this.settings["Search type"] || "Substructure";

	const rows = await search(searchType, mrvSource);

	const images = await mlutils.getImageURLs(_.map(rows, (row) => row.MOLECULE));

	_.each(images, (image, index) => {
		rows[index].base64image = image;
	});



	return {
		client: {
			rows: rows
		},
		report: {}
	};

}


//export the necessary plugin properties
module.exports = {
	name: "oracle-search",
	label: "Oracle Test",
	templateFile: "search.template.html",
	update: update,
	domains: ["*"],
	sortOrder: 370,
	settings: [{
		label: "Search type",
		type: "enum",
		default: "Substructure",
		values: ["Substructure", "Exact match", "Similarity"]
	}]
};