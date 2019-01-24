/*!
* BioTK isoelectric plugin
* Marvin Live realtime plugin example
* @license MIT
*/

"use strict";

const queryString = require("querystring");
const _ = require("lodash");
const mlutils = require("./ml-utils");

//"http://localhost:9555/bioreg-web"
const bioTK = process.env["BIOTOOLKIT_SERVER"];
const database = process.env["DBAASP_API"] || "https://dbaasp.org/api/v1";

async function convert(helm) {

	//canonicalize for DBAASP's database
	helm = helm.replace(/\[Orn\]/g, "X");

	const results = await mlutils.post({
		url: `${bioTK}/rest/conversion`,
		json: {
			outputFormat: "SEQUENCE",
			inputMacromolecule: {
				sequenceType: "PEPTIDE",
				macromolecule: helm,
				format: "HELM"
			}
		}
	});

	return results.macromolecule.trim();
}

async function search(sequence) {

	const requestOptions = {
		query: "search",
		sequence_option: "full",
		sequence: sequence,
		format: "json"
	};

	//query=search&sequence=VXLfP&format=json
	return mlutils.get({
		url: `${database}?${queryString.stringify(requestOptions)}`,
		json: true
	});
}

async function peptide_card(resultId) {

	const requestOptions = {
		query: "peptide_card",
		peptide_id: resultId,
		format: "json"
	};

	//query=search&sequence=VXLfP&format=json
	return mlutils.get({
		url: `${database}?${queryString.stringify(requestOptions)}`,
		json: true
	});
}


async function update(structure) {

	const sequence = await convert(structure);
	const results = await search(sequence);

	results.details = [];

	//fetch related data
	const detailPromises = _.chain(results.result)
	.take(5)
	.map(async (resultId, index) => {
		const details = await peptide_card(resultId);
		const peptideCard = details.peptideCard;
		const simplifiedCard = {
			id: peptideCard.id,
			name: peptideCard.name,
			targetGroups: peptideCard.targetGroups.join(", "),
			targetActivities: _.take(peptideCard.targetActivities, 3),
			reference: _.first(peptideCard.articles),
			pdb: peptideCard.pdb && peptideCard.pdb.indexOf("$") > 0 && peptideCard.pdb.split("$")[0]
		};
		results.details[index] = simplifiedCard;
	})
	.value();

	await Promise.all(detailPromises);

	const pdbPromises = _.map(results.details, async (peptideCard, i) => {
		if (peptideCard.pdb) {
			const pdbFile = await this.pdbUtils.load(peptideCard.pdb);
			results.details[i].pdbFile = pdbFile;
		}
	});
	await Promise.all(pdbPromises);


	const client = {
		results
	};
	const report = {
		"Matches": results.count
	};

	const data = {
		client,
		report
	};

	return data;


}


//export the necessary plugin properties, ie: this is the plugin interface
module.exports = {
	name: "helm-dbaasp",
	label: "Antimicrobial activity",
	templateFile: "helm-dbaasp.template.html",
	update: update,
	domains: ["*"],
	docs: "Runs subsequence search in the Database of Antimicrobial Activityand Structure of Peptides.",
	allowedContentTypes: ["biomolecule"],
	sortOrder: 9001
};