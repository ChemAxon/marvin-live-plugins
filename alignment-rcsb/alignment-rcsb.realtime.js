/*!
* ChemAxon 3D Alignment plugin
* Marvin Live realtime plugin example
* @license MIT
*/

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");

const ligandColors = ["#00ffff", "#ffa736", "#91f978", "#ff5bb7", "#0094a0", "#eceb4d", "#5dc648", "#b73bb5"];


const calculatorUrl = mlutils.JCWSURL + "rest-v0/util/calculate/alignment";
const calculatorBody = {
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
	return mlutils.post({
		url: cleanUrl,
		json: body,
		headers: { Accept: "*/*" }
	});
}


async function align(toAlign, reference, alignmentType) {
	const cleanedToAlign = await clean(toAlign);

	const body = _.cloneDeep(calculatorBody);

	if (alignmentType === "Extended atom types") {
		body.parameters.type = "EXTENDED_ATOMTYPE";
	}

	body.structure = reference;
	body.parameters.moleculesToAlign[0] = cleanedToAlign;

	return mlutils.post({ url: calculatorUrl, json: body });
}


async function update(mrvSource/*, baselineSource*/) {


	if (!this.settings || !this.settings["PDB code"]) {
		throw new Error("PDB code missing");
	}

	let method = "pdb";
	if (this.settings && this.settings["Protein file type (beta)"] === "CIF") {
		method = "mmtf";
	}

	const pdbCode = this.settings["PDB code"];
	const ligandCode = this.settings["Ligand code"];


	let proteinFile;
	let base;

	if (method === "pdb") {

		proteinFile = await this.pdbUtils.load(pdbCode);
		base = await this.pdbUtils.getResidue(pdbCode, ligandCode);

	} else {

		proteinFile = await this.pdbUtils.loadMMTF(pdbCode);
		base = await this.pdbUtils.getMMTFLigand(pdbCode, ligandCode);

	}


	let ligandCodes;
	let alignmentResults;
	if (!base) {
		if (method === "pdb") {
			ligandCodes = await this.pdbUtils.findLigands(pdbCode);
		} else {
			ligandCodes = await this.pdbUtils.findMMTFLigands(pdbCode);
		}
	} else {

		alignmentResults = await align(mrvSource, base, this.settings["Alignment type"]);

	}


	const roomNameTransformed = this.roomName.replace(/[^a-z0-9]/gi, "_").replace(/[_]+/g, "_");

	const response = {
		client: {
			colors: ligandColors,
			pdbCode,
			ligandCode,
			proteinFile,
			proteinFileType: method,
			aligned: _.get(alignmentResults, "aligned[0].structureData.structure"),
			reference: _.get(alignmentResults, "reference.structureData.structure"),
			downloadFilename: `${roomNameTransformed}-alignment-${pdbCode}-${ligandCode}.sdf`,
			ligandCodes
		},
		report: {
			Reference: `${pdbCode} - ${ligandCode}`
		}
	};

	return response;

}


module.exports = {
	name: "alignmentRcsb",
	label: "Alignment (PDB)",
	domains: ["*"],
	templateFile: "alignment-rcsb.template.html",
	update: update,
	sortOrder: 8,
	settings: [{
		label: "PDB code",
		type: "string",
		default: ""
	}, {
		label: "Ligand code",
		type: "string",
		default: ""
	}, {
		label: "Alignment type",
		type: "enum",
		values: ["Common scaffold", "Extended atom types"],
		default: "Common scaffold"
	}, {
		label: "Protein file type (beta)",
		type: "enum",
		values: ["PDB", "CIF"],
		default: "PDB"
	}],
	docs: "Performs rigid-flexible alignment using a selected ligand from a protein picked from the Protein Data Bank. If no ligands are selected, the protein is displayed in an interactive 3D viewer, along with the available ligand codes. If a ligand is selected, the idea molecule is also displayed with highlighted bonds."
};
