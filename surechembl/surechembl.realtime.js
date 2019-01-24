/*!
 * ChemAxon Madfast Similarity Search plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");

//"https://madfast-demo.chemaxon.com/";
const server = process.env["MADFAST_SERVER"];

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

	let metric = "";
	if (this.settings && this.settings["Search type"] && this.settings["Search type"] === "Substructure-like") {
		metric = "tversky,coeffT:0.0,coeffQ:1.0";
	}

	const results = await mlutils.post({
		url: server + "rest/descriptors/surechembl-cfp7/find-most-similars",
		form: {
			"query": mrvSource,
			"max-count": 20,
			"metric": metric
		},
		json: true
	});

	const sdfDownloads = _.map(results.targets, async (target) => {
		const sdf = await mlutils.get({
			url: server + target.targetmolurl + "/sdf"
		});
		target.data = {
			"ID": target.targetid
		};
		target.sdf = sdf;
		return sdf;
	});

	await Promise.all(sdfDownloads);

	const sdfs = _.map(results.targets, (target) => target.sdf);
	const images = await mlutils.getImageURLs(sdfs);
	_.each(images, (image, index) => {
		results.targets[index].base64image = image;
	});

	const report = {};
	if (results.targets && results.targets[0]) {
		report["Highest similarity"] = format(1 - results.targets[0].dissimilarity);
		report["ID"] = results.targets[0].targetid;
	}

	return {
		client: results,
		report: report
	};

}

module.exports = {
	name: "surechembl",
	label: "SureChEMBL",
	update: update,
	templateFile: "surechembl.template.html",
	domains: ["*"],
	settings: [{
		label: "Search type",
		type: "enum",
		default: "Similarity",
		values: ["Similarity", "Substructure-like"]
	}],
	sortOrder: 36,
	docs: "Searches the SureChEMBL database with using chemical hashed fingerprint. Similarity search uses tanimoto metric, substructure-like search sues Tversky metric with coefficients 0.0 and 1.0. The most similar 20 results will be displayed with no cutoff.",
	debounceTimeout: 5000
};