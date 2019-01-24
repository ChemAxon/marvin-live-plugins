/*!
 * hERG MMP search using reactant superstructure search
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");

//"https://mmp-ws.chemaxon.com/webservices//rest-v0/data/chembl-mmp/table/herg";
const server = process.env["HERG_TABLE_JCWS"];


async function search(structure) {
	return mlutils.post({
		url: `${server}/search`,
		json: {
			searchOptions: {
				queryStructure: structure,
				searchType: "SUPERSTRUCTURE"
			},
			filter: {
				orderBy: "median"
			},
			paging: {
				offset: 0,
				limit: 20
			},
			display: {
				include: ["cd_structure", "occurrences", "median", "maximum", "to_smiles", "radius", "minimum", "transformation"],
				parameters: {
					"cd_structure-display": {
						include: ["structureData"],
						parameters: {
							structureData: "smiles"
						}
					}
				}
			}
		},
		timeout: 10000
	});
}


async function addReactionImages(results) {
	const reactions = _.map(results.data, (hit) => hit.transformation);

	const width = 600;
	const images = await mlutils.getImageURLs(reactions, width);
	_.each(images, (image, index) => {
		results.data[index].base64image = image;
	});

	return results;
}


async function update(mrvSource) {

	const searchResults = await search(mrvSource);
	const results = await addReactionImages(searchResults);

	const report = {};

	return {
		client: {
			results: results
		},
		report: report
	};

}

module.exports = {
	name: "herg-mmp",
	label: "hERG assistant",
	update: update,
	templateFile: "herg-mmp.template.html",
	domains: ["internal"],
	sortOrder: 36,
	docs: "Suggests transformations on a molecule using ChEMBL data matched molecular pairs with at least 5 "
};