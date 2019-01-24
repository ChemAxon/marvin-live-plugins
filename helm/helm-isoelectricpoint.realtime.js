/*!
 * BioTK isoelectric plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const mlutils = require("./ml-utils");

//e.g. "http://localhost:9555/bioreg-web";
const server = process.env["BIOTOOLKIT_SERVER"];

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

async function calculate(structure) {

	return mlutils.post({
		url: `${server}/rest/macromolecules/isoelectricPoint`,
		body: structure,
		headers: {
			"Content-Type": "text/plain"
		}
	});
}


async function update(structure, baseline) {

	const results = [calculate(structure)];
	if (baseline) {
		results.push(calculate(baseline));
	}

	const values = await Promise.all(results);

	const [current, pinned] = values;

	const numValues = [];
	numValues.push(format(current));
	if (baseline) {
		numValues.push(format(pinned));
	}

	const client = {
		properties: [{
			label: "pI",
			values: numValues
		}],
		hasPinnedValues: !!baseline
	};
	const report = {
		"pI": current
	};


	const data = {
		client,
		report
	};

	return data;
}


//export the necessary plugin properties, ie: this is the plugin interface
module.exports = {
	name: "helmIsoelectricPoint",
	label: "Isoelectric Point",
	templateFile: "helm-isoelectricpoint.template.html",
	update: update,
	domains: ["*"],
	docs: "Predicts the isoelectric point of biomolecules.",
	allowedContentTypes: ["biomolecule"],
	sortOrder: 9001
};