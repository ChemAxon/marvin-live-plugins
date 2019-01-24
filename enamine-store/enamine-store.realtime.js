/*!
 * Enamine Store plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");
const queryString = require("querystring");

const credentials = {
	username: process.env["ENAMINE_STORE_USERNAME"],
	password: process.env["ENAMINE_STORE_PASSWORD"]
};

//"https://www.enaminestore.com/api";
const resourceEndpoint = process.env["ENAMINE_STORE_API"] || "https://www.enaminestore.com/api";
const resourceOptions = {
	code: "",
	currency: "EUR",
	sim: 0.8,
	mode: "SCR"
};

const catalogCodes = {
	"Screening compounds": "SCR",
	"Building blocks": "BB"
};

const searchCodes = {
	"Substructure": "sub",
	"Similarity": "sim"
};


async function search(smiles, searchType, catalog) {

	const requestOptions = _.clone(resourceOptions);
	requestOptions.code = `search_${smiles}_${searchCodes[searchType]}`;
	requestOptions.mode = catalogCodes[catalog];
	const requestUrl = resourceEndpoint + "?" + queryString.stringify(requestOptions);

	return mlutils.get({
		url: requestUrl,
		json: true,
		headers: {
			Authorization: `login=${credentials.username}, pass=${credentials.password}`
		}
	});
}


async function update(structure) {

	const searchType = this.settings && this.settings["Search type"] || "Substructure";
	const catalog = this.settings && this.settings["Catalog"] || "Screening compounds";

	//convert from MRV to SMILES
	let smiles = await mlutils.convert(structure, "smiles");

	smiles = smiles.trim();

	//do the search
	const response = await search(smiles, searchType, catalog);

	if (response.status === 2) {
		console.log("enamine-store authentication problem");
	}

	response.data = response.data || [];
	response.matches = response.data.length;
	response.data = _.slice(response.data, 0, 20);

	const images = await mlutils.getImageURLs(_.map(response.data, (compound) => compound.smile));
	_.each(images, (image, index) => {
		response.data[index].base64image = image;
	});

	//create an object that holds the outcome of this update call
	const results = {};

	//add the compound list for the browsers
	results.client = {
		compounds: response.data,
		matches: response.matches
	};

	//produce simple key-value for reports
	results.report = {
		"Compound IDs": _.map(response.data, (compound) => compound["Id"]).join(", ")
	};

	return results;

}


//export the necessary plugin properties
module.exports = {
	name: "enamine-store",
	label: "Enamine Store",
	templateFile: "enamine-store.template.html",
	update: update,
	domains: ["*"],
	sortOrder: 254,
	settings: [{
		label: "Search type",
		type: "enum",
		default: "Substructure",
		values: ["Substructure", "Similarity"]
	},
	{
		label: "Catalog",
		type: "enum",
		default: "Screening compounds",
		values: ["Screening compounds", "Building blocks"]
	}],
	docs: "Searches the Enamine Store using substructure or similarity search.",
	enableGapfillingMode: false
};