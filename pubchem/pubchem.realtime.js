/*!
* PubChem search realtime plugin
* Marvin Live realtime plugin example
* @license MIT
*/

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");

const searchUrl = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/%searchtype%/SMILES/%smiles%/JSON?MaxRecords=20&MaxSeconds=5&Threshold=%threshold%";


async function search(smiles, searchType, similarityThreshold) {

	return mlutils.get({
		url: searchUrl.replace("%searchtype%", searchType).replace("%smiles%", encodeURIComponent(smiles)).replace("%threshold%", similarityThreshold),
		json: true
	});

}

async function update(structure) {

	let searchType = "fastsubstructure";
	if (this.settings && this.settings["Search type"] === "Similarity") {
		searchType = "fastsimilarity_2d";
	}

	let similarityThreshold = 90;
	if (this.settings && this.settings["Similarity threshold"]) {
		similarityThreshold = this.settings["Similarity threshold"];
	}

	const smiles = await mlutils.convert(structure, "smiles");
	const results = await search(smiles.trim(), searchType, similarityThreshold);

	const hits = _.map(results.PC_Compounds, (item) => {

		const hitSmiles = _.chain(item.props)
		.filter((prop) => _.get(prop, "urn.label") === "SMILES" && _.get(prop, "value.sval"))
		.map((rowItem) => _.get(rowItem, "value.sval"))
		.head()
		.value();

		const cid = _.get(item, "id.id.cid");

		return {
			cid,
			smiles: hitSmiles
		};
	});

	const total = _.get(results, "PC_Compounds.length");

	return {
		hits,
		total
	};

}


//export the necessary plugin properties
module.exports = {
	name: "pubchem",
	label: "Pubchem analogs",
	templateFile: "pubchem.template.html",
	update: update,
	domains: ["*"],
	settings: [{
		label: "Search type",
		type: "enum",
		default: "Substructure",
		values: ["Substructure", "Similarity"]
	}, {
		label: "Similarity threshold",
		type: "number",
		default: 90,
		min: 1,
		max: 100,
		step: 1
	}],
	docs: "Performs substructure or similarity searches on the PubChem Compound database, using the Fast Substructure or Fast Similarity 2D services. The first 20 results produced in max. 5 seconds are returned and displayed at 2D images. The source molecules can be copied as SMILES.",
	sortOrder: 70
};