/*!
* ChemAxon Calculator Plugins realtime plugin
* Marvin Live realtime plugin example
* @license MIT
*/

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");

const url = mlutils.JCWSURL + "rest-v0/util/detail";
const postBody = {
	"structures": [],
	"display": {
		"include": ["elementalAnalysis", "logP", "pKa", "topologyAnalysis", "polarSurfaceArea", "solubility", "hbda"],
		"parameters": {
			"logP": {
				"result-display": {
					"include": [
						"something_that_doesn't_exis"
					]
				}
			},
			"pKa": {
				"pHLower": 7.4,
				"pHUpper": 7.4,
				"pHStep": 0.1,
				"result-display": {
					"include": [
						"something_that_doesn't_exis"
					]
				},
				"microspecies-display": {
					"include": [
						"something_that_doesn't_exis"
					]
				}
			},
			"solubility": {
				"pHLower": 7.4,
				"pHUpper": 7.4,
				"pHStep": 0.1,
				"unit": "MOLPERL"
			},
			"hbda": {
				"displayMajorMicrospecies": true,
				"pHLower": 7.4,
				"pHUpper": 7.4,
				"pHStep": 0.1,
				"result-display": {
					"include": [
						"something_that_doesn't_exis"
					]
				}
			},
			"topologyAnalysis": {
				"distanceDegree-display": {
					"include": [
						"something_that_doesn't_exis"
					]
				},
				"eccentricity-display": {
					"include": [
						"something_that_doesn't_exis"
					]
				},
				"stericEffect-display": {
					"include": [
						"something_that_doesn't_exis"
					]
				}
			}
		}
	}
};

const labels = {
	mass: "Mass",
	logp: "cLogP",
	psa: "TPSA",
	pksa: "pKa (str. acidic)",
	pksb: "pKa (str. basic)",
	fsp3: "FSP3",
	solubility: "Solubility",
	hba: "H-bond acceptors",
	hbd: "H-bond donors"
};

const units = {
	psa: "Å²",
	solubility: "mM"
};

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

	//clone the request body to not interfere with other requests
	const requestBody = _.cloneDeep(postBody);

	//add structure as query
	requestBody.structures[0] = {
		structure: structure
	};

	const results = await mlutils.post({
		url: url,
		json: requestBody
	});

	const [data] = results.data;
	const filteredData = {};

	if (_.get(data, "elementalAnalysis.mass") !== undefined) {
		filteredData["mass"] = format(_.get(data, "elementalAnalysis.mass"));
	}
	if (_.get(data, "logP.logpnonionic") !== undefined) {
		filteredData["logp"] = format(_.get(data, "logP.logpnonionic"));
	}
	if (_.get(data, "polarSurfaceArea.polarSurfaceArea")) {
		filteredData["psa"] = format(_.get(data, "polarSurfaceArea.polarSurfaceArea"));
	}
	if (_.get(data, "pKa.mostAcidic[0]") !== undefined) {
		//sa = strongest acidic
		filteredData["pksa"] = format(_.get(data, "pKa.mostAcidic[0]"));
	}
	if (_.get(data, "pKa.mostBasic[0]") !== undefined) {
		//sb = strongest basic
		filteredData["pksb"] = format(_.get(data, "pKa.mostBasic[0]"));
	}
	if (_.get(data, "topologyAnalysis.atomBond.fsp3") !== undefined) {
		const value = _.get(data, "topologyAnalysis.atomBond.fsp3");
		if (value && value.isNaN) {
			filteredData["fsp3"] = undefined;
		} else {
			filteredData["fsp3"] = format(value);
		}
	}
	if (_.get(data, "solubility.intrinsicSolubility") !== undefined) {
		//convert to micromolar
		filteredData["solubility"] = format(_.get(data, "solubility.intrinsicSolubility") * 1000);
	}
	if (_.get(data, "hbda.acceptorAtomCount") !== undefined) {
		filteredData["hba"] = _.get(data, "hbda.acceptorAtomCount");
	}
	if (_.get(data, "hbda.donorAtomCount") !== undefined) {
		filteredData["hbd"] = _.get(data, "hbda.donorAtomCount");
	}

	return filteredData;
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
		const numValues = [];
		if (current[name] !== undefined) {
			numValues[0] = current[name];
			report[label] = current[name];
		}
		if (pinned) {
			numValues[1] = pinned[name];
		}
		client.properties.push({
			label: label,
			values: numValues,
			unit: units[name]
		});
	});

	const data = {
		client: client,
		report: report
	};

	return data;

}


//export the necessary plugin properties, ie: this is the plugin interface
module.exports = {
	name: "calculatedProperties",
	label: "Calculated Properties",
	templateFile: "calculated-properties.template.html",
	update: update,
	domains: ["*"],
	docs: "Predicts the basic med-chem properties of a molecule, with optional comparison to the pinned structure.",
	sortOrder: 10,
	maxRunningJobs: 2
};