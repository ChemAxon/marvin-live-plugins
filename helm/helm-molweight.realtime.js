/*!
 * BioTK molweight plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const mlutils = require("./ml-utils");
const _ = require("lodash");

//e.g. "http://localhost:9555/bioreg-web";
const server = process.env["BIOTOOLKIT_SERVER"];

const labels = {
	lowerLimit: "Molweight"
};

async function calculate(structure) {

	let id;
	try {
		id = await mlutils.post({
			url: `${server}/rest/macromolecules`,
			json: {
				entityType: "OTHER",
				helm: structure,
				name: null,
				macromoleculeData: []
			},
			headers: {
				Accept: "text/plain"
			}
		});
	} catch (error) {
		const errorMessage = _.get(error, "body.error.message");
		const cidRe = /CID:\s([^)]+)/;
		const matches = errorMessage.match(cidRe);
		if (matches) {
			return matches[1];
		} else {
			throw error;
		}
	}

	return mlutils.get({
		url: `${server}/rest/macromolecules/${id}/molweight`,
		json: true
	});
}


async function update(structure, baseline) {

	const results = [calculate(structure)];
	if (baseline) {
		results.push(calculate(baseline));
	}

	const values = await Promise.all(results);

	const [current, pinned] = values;

	const client = {
		properties: [],
		hasPinnedValues: !!baseline
	};
	const report = {};
	_.each(labels, (label, name) => {
		const numValues = [current[name]];
		if (pinned) {
			numValues.push(pinned[name]);
		}
		client.properties.push({
			label: label,
			values: numValues
		});

		report[label] = current[name];
	});

	const data = {
		client,
		report
	};

	return data;
}


//export the necessary plugin properties, ie: this is the plugin interface
module.exports = {
	name: "helmMolweight",
	label: "Molweight",
	templateFile: "helm-molweight.template.html",
	update: update,
	domains: ["*"],
	docs: "Predicts the molweight of biomolecules.",
	allowedContentTypes: ["biomolecule"],
	sortOrder: 9000
};