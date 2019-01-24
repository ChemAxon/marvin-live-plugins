/*!
* ChEMLB plugin
* Marvin Live realtime plugin example
* @license MIT
*/

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");

//mychembl VM
//const myChEMLBServer = "http://192.168.1.249/chemblws";

//chembl official
const myChEMLBServer = "https://www.ebi.ac.uk/chembl/api/data";

const similarityEndPoint = `${myChEMLBServer}/similarity/%s/80?format=json&limit=20`;
const bioactivityEndPoint = `${myChEMLBServer}/activity?molecule_chembl_id=%s&format=json&limit=6&pchembl_value__gte=5&order_by=-pchembl_value`;


//search in chembl
async function getCompounds(smiles) {
	const results = await mlutils.get({
		url: similarityEndPoint.replace("%s", encodeURIComponent(smiles)),
		json: true
	});

	if (_.isEmpty(results.molecules)) {
		throw new Error("No matching molecules", smiles);
	}
	return results;
}

async function update(structure) {

	const results = {};

	//convert from MRV to SMILES
	const smiles = await mlutils.convert(structure, "smiles");

	//do the search
	let chemblMatches;
	try {
		chemblMatches = await getCompounds(smiles.trim());
	} catch (err) {
		return results;
	}

	//fetch related data
	const bioactivityPromises = _.map(chemblMatches.molecules, async (molecule) => {
		try {
			const activities = await mlutils.get({
				url: bioactivityEndPoint.replace("%s", encodeURIComponent(molecule.molecule_chembl_id)),
				json: true
			});

			molecule.activities = activities.activities;
		} catch (err) {
			//cannot load or there are no activities for this molecule
		}
	});

	await Promise.all(bioactivityPromises);


	//fetch a base64 encoded image for each molecule, in 1 batch
	const smilesList = _.map(chemblMatches.molecules, (molecule) => molecule.molecule_structures.canonical_smiles);
	const images = await mlutils.getImageURLs(smilesList);
	_.each(images, (image, index) => {
		chemblMatches.molecules[index].base64image = image;
	});


	//add the JSON results as data for the clients
	results.client = chemblMatches;

	_.each(results.client.molecules, (mol) => {
		if (!mol.activities.length) {
			return;
		}
		mol.structureData = {};
		_.each(mol.activities, (activity) => {
			mol.structureData[`${activity.assay_chembl_id} ${activity.standard_type} (${activity.standard_units})`] = activity.standard_value;
		});
	});

	//produce simple key-value for reports
	results.report = {
		"Matches": chemblMatches.page_meta.total_count
	};
	if (chemblMatches && chemblMatches.molecules && chemblMatches.molecules[0]) {
		results.report["Most similar"] = chemblMatches.molecules[0].molecule_chembl_id;
	}

	return results;

}


//export the necessary plugin properties
module.exports = {
	name: "chembl",
	label: "ChEMBL Activity",
	templateFile: "chembl.template.html",
	update: update,
	domains: ["*"],
	docs: "Performs similarity search on ChEMBL's compound database and pulls activity values. The most similar 20 molecules are returned and the 6 highest activity assays are displayed with a minimum p_chembl value of 5.",
	sortOrder: 50
};