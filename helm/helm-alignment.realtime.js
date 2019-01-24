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

const aminoAcidColors = {
	A: "#80a0f0",
	I: "#80a0f0",
	L: "#80a0f0",
	M: "#80a0f0",
	F: "#80a0f0",
	W: "#80a0f0",
	V: "#80a0f0",

	K: "#f01505",
	O: "#f01505",
	R: "#f01505",

	E: "#c048c0",
	D: "#c048c0",

	B: "#15c015",
	N: "#15c015",
	Q: "#15c015",
	Z: "#15c015",
	S: "#15c015",
	T: "#15c015",

	C: "#f08080",
	U: "#f08080",

	G: "#f09048",

	P: "#c0c000",

	H: "#15a4a4",
	Y: "#15a4a4",

	"-": "#DDDDDD"
};

async function align(sequence1, sequence2) {

	return mlutils.post({
		url: `${server}/rest/macromolecules/pairwiseSequenceAlignment`,
		json: {
			sequence1,
			sequence2
		}
	});
}

async function convert(helm) {

	const results = await mlutils.post({
		url: `${server}/rest/conversion`,
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


function mapLetterToAminoAcid(letter) {
	return {
		code: letter,
		color: aminoAcidColors[letter]
	};
}


async function update(structure, baseline) {

	if (!baseline) {
		throw new Error("Required pinned structure missing");
	}

	const values = await Promise.all([convert(structure), convert(baseline)]);

	const alignment = await align(...values);


	const blocks = [];
	_.each(alignment.alignedSequence1, (letter, i) => {
		if (i % 10 === 0) {
			blocks.push([]);
		}
		const lastBlock = _.last(blocks);
		lastBlock.push({
			s1: mapLetterToAminoAcid(letter),
			s2: mapLetterToAminoAcid(alignment.alignedSequence2[i])
		});
	});

	const data = {
		client: {
			sequences: blocks
		},
		report: {}
	};

	return data;
}


//export the necessary plugin properties, ie: this is the plugin interface
module.exports = {
	name: "helmAlignment",
	label: "Sequence alignment",
	templateFile: "helm-alignment.template.html",
	update: update,
	domains: ["*"],
	docs: "Calculates the alignment of biomolecules.",
	allowedContentTypes: ["biomolecule"],
	sortOrder: 9000
};