/*!
 * ChemAxon MMFF94 plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");
const chroma = require("chroma-js");

const calculatorUrl = mlutils.JCWSURL + "rest-v0/util/calculate/conformer";
const requestBody = {
	structure: null,
	"parameters": {
		"maxNumberOfConformers": 20,
		"diversity": 0.3,
		"result-display": {
			"include": ["structureData"],
			"parameters": {
				"structureData": "sdf:V2,-a"
			}
		}
	}
};

function format(num) {
	return +parseFloat(num).toFixed(1);
}


async function update(mrvSource) {

	const body = _.cloneDeep(requestBody);
	body.structure = mrvSource;

	const results = await mlutils.post({ url: calculatorUrl, json: body });

	const energies = _.map(results.result, (item) => item.energy);

	const scale = new chroma
		.scale(["#00BAFF", "#D1004F"])
		.domain([_.min(energies), _.min(energies) + 13])
		.mode("lab");

	const structures = _.map(results.result, (item, index) => {
		const delta = format(item.energy - _.min(energies));
		const deltaStr = `+${delta} KCal`;
		const label = `${index + 1}. ${(index === 0 || delta == 0 ? "LE" : deltaStr)}`;

		const mol = item.structureData.structure;
		const color = scale(item.energy).hex();

		return {
			mol,
			label,
			color
		};
	});

	return {
		structures
	};
}


module.exports = {
	name: "conformers",
	label: "Conformers",
	templateFile: "conformers.template.html",
	update: update,
	domains: ["*"],
	docs: "Predicts the lowest energy conformers of a molecule and displays it in an interactive 3D viewer. Bonds of the conformations are colored based on the predicted delta energy from blue to red. The 10 lowest energy conformations are returned.",
	sortOrder: 20
};