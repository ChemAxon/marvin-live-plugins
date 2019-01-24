/*!
 * ChemAxon 3D Alignment plugin
 * Marvin Live realtime plugin example
 * @license MIT
*/

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");

const requestUrl = mlutils.JCWSURL + "rest-v0/util/calculate/alignment";
const requestBody = {
	"structure": null,
	"parameters": {
		"moleculesToAlign": [],
		"includeFusedMolecules": false,
		"aligned-display": {
			"parameters": {
				"structureData": "sdf:V2,-a"
			}
		},
		"reference-display": {
			"parameters": {
				"structureData": "sdf:V2,-a"
			}
		}
	}
};


const cleanUrl = mlutils.JCWSURL + "rest-v0/util/convert/clean";
const cleanBody = {
	"structure": null,
	"parameters": {
		"dim": 3
	}
};

async function clean(source) {
	const body = _.cloneDeep(cleanBody);
	body.structure = source;
	return mlutils.post({ url: cleanUrl, json: body, headers: { Accept: "*/*" } });
}

async function align(toAlign, reference, alignmentType) {
	const cleanedToAlign = await clean(toAlign);
	const body = _.cloneDeep(requestBody);

	if (alignmentType === "Extended atom types") {
		body.parameters.type = "EXTENDED_ATOMTYPE";
	}

	body.structure = reference;
	body.parameters.moleculesToAlign[0] = cleanedToAlign;
	return mlutils.post({ url: requestUrl, json: body });
}

async function update(mrvSource, baselineSource) {
	const results = await align(mrvSource, baselineSource, this.settings && this.settings["Alignment type"]);

	return {
		aligned: _.get(results, "aligned[0].structureData.structure"),
		reference: _.get(results, "reference.structureData.structure")
	};
}

module.exports = {
	name: "alignmentpinned",
	label: "Alignment (pinned)",
	domains: ["internal"],
	templateFile: "alignment_pinned.template.html",
	update: update,
	sortOrder: 9,
	settings: [{
		label: "Alignment type",
		type: "enum",
		values: ["Common scaffold", "Extended atom types"],
		default: "Common scaffold"
	}],
	docs: "Performs rigid-flexible alignment using the pinned structure as a rigid base. If the pinned structure has no 3D coordinates, its lowest energy conformer will be used. The results are displayed in an interactive 3D viewer, with the pinned structure highlighted orange and the idea molecule highlighted in cyan color."
};