/*!
* Molport plugin
* Marvin Live realtime plugin example
* @license MIT
*/

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");


const credentials = {
	username: process.env["MOLPORT_USERNAME"],
	password: process.env["MOLPORT_PASSWORD"]
};


const molportAPI = process.env["MOLPORT_API"] || "https://api.molport.com/api";


async function search(smiles, searchType) {

	const searchTypeId = {
		"Similarity": 4,
		"Substructure": 1,
		"Exact match": 3
	};

	return mlutils.post({
		url: `${molportAPI}/chemical-search/search`,
		json: {
			"User Name": credentials.username,
			"Authentication Code": credentials.password,
			"Structure": smiles,
			"Search Type": searchTypeId[searchType],
			"Maximum Search Time": 2000,
			"Maximum Result Count": 20,
			"Chemical Similarity Index": 0.9
		}
	});
}


async function update(structure) {

	const searchType = this.settings && this.settings["Search type"] || "Substructure";

	//convert from MRV to SMILES
	let smiles = await mlutils.convert(structure, "smiles");

	smiles = smiles.trim();

	const response = await search(smiles, searchType);

	const compounds = _.get(response, "Data.Molecules");

	_.each(compounds, (compound) => {
		compound.url = "https://www.molport.com/shop/moleculelink/about-this-molecule/" + compound.Id;
		compound.data = {
			ID: compound["MolPort Id"]
		};
	});

	if (searchType === "similarity") {
		_.each(compounds, (compound) => {
			compound.similarity = _.round(1 - compound["Similarity Index"], 2);
		});
	}

	const images = await mlutils.getImageURLs(_.map(compounds, (compound) => compound.SMILES));
	_.each(images, (image, index) => {
		compounds[index].base64image = image;
	});

	//create an object that holds the outcome of this update call
	const results = {};

	//add the compound list for the browsers
	results.client = {
		compounds: compounds
	};

	//produce simple key-value for reports
	results.report = {
		"Compound IDs": _.map(compounds, (compound) => {
			return compound["MolPort Id"];
		}).join(", ")
	};

	return results;

}


//export the necessary plugin properties
module.exports = {
	name: "molport",
	label: "Molport",
	templateFile: "molport.template.html",
	update: update,
	domains: ["*"],
	sortOrder: 250,
	settings: [{
		label: "Search type",
		type: "enum",
		default: "Substructure",
		values: ["Substructure", "Exact match", "Similarity"]
	}],
	docs: "Searches the MolPort catalog using similarity search.",
	enableGapfillingMode: false
};