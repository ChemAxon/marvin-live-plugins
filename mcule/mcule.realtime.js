/*!
* Molport plugin
* Marvin Live realtime plugin example
* @license MIT
*/

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");
const queryString = require("querystring");


const remoteAddress = process.env["MCULE_API"] || "https://mcule.com/api";

const credentials = {
	token: process.env["MCULE_ACCESS_TOKEN"]
};


async function search(smiles) {

	const urlSearch = queryString.stringify({
		query: smiles
	});

	return mlutils.get({
		url: `${remoteAddress}/v1/search/lookup/?${urlSearch}`,
		json: true
	});
}

async function getAvailability(mculeId) {
	return mlutils.get({
		url: `${remoteAddress}/v1/compound/${mculeId}/availability/`,
		json: true,
		headers: {
			Authorization: `Token ${credentials.token}`
		}
	});
}


async function update(structure) {

	//convert from MRV to SMILES
	let smiles = await mlutils.convert(structure, "smiles");

	smiles = smiles.trim();

	//do the search
	const { results: compounds } = await search(smiles);

	const images = await mlutils.getImageURLs(_.map(compounds, (compound) => compound.smiles));
	_.each(images, (image, index) => {
		compounds[index].base64image = image;
	});

	const availabilityPromises = _.map(compounds, async (compound) => {
		const availability = await getAvailability(compound["mcule_id"]);
		compound.availability = availability;
	});

	await Promise.all(availabilityPromises);


	_.each(compounds, (compound) => {
		compound.data = {
			ID: compound["mcule_id"]
		};
	});

	//create an object that holds the outcome of this update call
	const results = {};

	//add the compound list for the browsers
	results.client = {
		compounds: compounds
	};

	//produce simple key-value for reports
	results.report = {
		"Compound IDs": _.map(compounds, (compound) => compound["mcule_id"]).join(", ")
	};

	return results;

}


//export the necessary plugin properties
module.exports = {
	name: "mcule",
	label: "MCule",
	templateFile: "MCule.template.html",
	update: update,
	domains: ["*"],
	sortOrder: 251,
	docs: "Searches the MCule catalog using similarity search.",
	enableGapfillingMode: false
};