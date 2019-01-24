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
		"include": ["elementalAnalysis", "logP", "logD", "pKa", "polarSurfaceArea", "hbda"],
		"parameters": {
			"logP": {
				"result-display": {
					"include": [
						"something_that_doesn't_exis"
					]
				}
			},
			"logD": {
				"pHLower": 7.4,
				"pHUpper": 7.4,
				"pHStep": 0.1
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
			}
		}
	}
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


function scoreMass(value) {
	if (value === undefined) {
		return 0;
	}
	if (value <= 360) {
		return 1;
	}
	if (value > 500) {
		return 0;
	}
	return 500 / (500 - 360) - value / (500 - 360);
}

function scoreLogP(value) {
	if (value === undefined) {
		return 0;
	}
	if (value <= 3) {
		return 1;
	}
	if (value > 5) {
		return 0;
	}
	return 5 / (5 - 3) - value / (5 - 3);
}

function scoreLogD(value) {
	if (value === undefined) {
		return 0;
	}
	if (value <= 2) {
		return 1;
	}
	if (value > 4) {
		return 0;
	}
	return 4 / (4 - 2) - value / (4 - 2);
}

function scorePKA(value) {
	if (value === undefined) {
		return 1;
	}
	if (value <= 8) {
		return 1;
	}
	if (value > 10) {
		return 0;
	}
	return 10 / (10 - 8) - value / (10 - 8);
}

function scoreTPSA(value) {
	if (value === undefined) {
		return 0;
	}
	if (value > 40 && value <= 90) {
		return 1;
	}
	if (value <= 20 || value > 120) {
		return 0;
	}
	if (value >= 20 && value <= 40) {
		return value / (40 - 20) + 20 / (20 - 40);
	}
	if (value > 90 && value <= 120) {
		return 120 / (120 - 90) - value / (120 - 90);
	}
}

function scoreHBD(value) {
	if (value === undefined) {
		return 0;
	}
	if (value <= 0.5) {
		return 1;
	}
	if (value > 3.5) {
		return 0;
	}
	return 3.5 / (3.5 - 0.5) - value / (3.5 - 0.5);
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

	const filteredData = [
		format(scoreMass(_.get(data, "elementalAnalysis.mass"))),
		format(scoreLogP(_.get(data, "logP.logpnonionic"))),
		format(scoreLogD(_.get(data, "logD.logD"))),
		format(scoreTPSA(_.get(data, "polarSurfaceArea.polarSurfaceArea"))),
		format(scorePKA(_.get(data, "pKa.mostBasic[0]"))),
		format(scoreHBD(_.get(data, "hbda.donorAtomCount")))
	];

	return filteredData;
}


async function update(structure, baseline) {

	const calculations = [calculate(structure)];
	if (baseline) {
		calculations.push(calculate(baseline));
	}

	const values = await Promise.all(calculations);
	const client = {
		labels: ["Mass score", ["cLogP", "score"], ["cLogD", "score"], ["TPSA score"], ["pKa (str.", "basic) score"], ["H-bond", "donor score"]],
		data: values,
		series: ["Current", "Pinned"],
		options: {
			scale: {
				ticks: {
					min: 0,
					max: 1,
					stepSize: 0.25
				}
			},
			startAngle: 0
		},
		hasPinnedValues: !!baseline,
		scores: _.map(values, (scoreValues) => format(_.sum(scoreValues)))
	};

	const data = {
		client: client,
		report: {
			"MPO Score": client.scores[0]
		}
	};

	return data;
}


//export the necessary plugin properties, ie: this is the plugin interface
module.exports = {
	name: "mpo-chart",
	label: "CNS MPO",
	templateFile: "mpochart.template.html",
	update: update,
	domains: ["*"],
	sortOrder: 11,
	docs: "Calculates the CNS MPO score of the molecule and displays it on a radar plot with separate axes for each score component, optionally comparing with the pinned structure. http://pubs.acs.org/doi/abs/10.1021/cn100008c",
	maxRunningJobs: 2
};