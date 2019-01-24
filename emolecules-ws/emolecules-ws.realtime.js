/*!
 * eMolecules WS plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");

const queryTypes = {
	"Substructure": "SSS",
	"Similarity": "SIM",
	"Exact match": "DUP"
};

//"https://user:pass@mlive-emolecules.chemaxon.com";
const server = process.env["EMOLECULES_WS"];

function format(num) {
	if (!num) {
		return num;
	}
	if (!parseFloat(num) && parseFloat(num) !== 0) {
		return num;
	}
	//plus sign drops trailing zeroes
	return +parseFloat(num).toFixed(2);
}

async function update(mrvSource) {

	const searchType = this.settings && queryTypes[this.settings["Search type"]] || "SSS";
	const similarityThreshold = this.settings && this.settings["Search type"] === "Similarity" ? "/0.9" : "";

	const results = await mlutils.post({
		url: `${server}/v1/search/${searchType}/20${similarityThreshold}`,
		body: mrvSource,
		headers: {
			"Content-Type": "text/plain"
		}
	});

	const rows = JSON.parse(results);

	_.each(rows, (row) => {
		if (row.similarity) {
			row.similarity = format(row.similarity);
		}
	});


	const images = await mlutils.getImageURLs(_.map(rows, (row) => row.mol));
	_.each(images, (image, index) => {
		rows[index].base64image = image;
	});

	return {
		client: {
			rows: rows
		},
		report: {
			VIDs: _.map(rows, (row) => row.version_id).join(", ")
		}
	};

}


//export the necessary plugin properties
module.exports = {
	name: "emolecules-ws",
	label: "eMolecules (hosted)",
	templateFile: "emolecules-ws.template.html",
	update: update,
	domains: ["*"],
	sortOrder: 170,
	settings: [{
		label: "Search type",
		type: "enum",
		default: "Substructure",
		values: ["Substructure", "Exact match", "Similarity"]
	}]
};