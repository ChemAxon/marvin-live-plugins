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
		"include": ["elementalAnalysis", "logP"],
		"parameters": {
			"logP": {
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
	const data = results.data[0];
	const filteredData = {
		mass: format(_.get(data, "elementalAnalysis.mass")),
		logp: format(_.get(data, "logP.logpnonionic"))
	};

	return filteredData;
}


const axes = {
	mass: "y",
	logp: "x"
};


async function update(structure, baseline) {

	const results = [calculate(structure)];
	if (baseline) {
		results.push(calculate(baseline));
	}

	const values = await Promise.all(results);

	const dots = _.chain(values).map((structureValues) => {

		return _.mapKeys(structureValues, (value, key) => {
			return axes[key];
		});

	}).each((dot) => {

		if (dot.y < 0) {
			dot.y = 0;
		} else if (dot.y > 800) {
			dot.y = 800;
		}

		if (dot.x < 0) {
			dot.x = 0;
		} else if (dot.x > 6) {
			dot.x = 6;
		}

	}).value();


	dots[0].color = "#4982d8";
	dots[0].border = "#224e91";
	if (dots[1]) {
		dots[1].color = "#999";
		dots[1].border = "#666";
	}

	return {
		client: {
			dots
		},
		report: {}
	};

}


//export the necessary plugin properties, ie: this is the plugin interface
module.exports = {
	name: "calculatedPropertiesSweetSpot",
	label: "Sweet Spot",
	templateFile: "calculated-properties-sweetspot.template.html",
	update: update,
	domains: ["*"],
	docs: "Calculates the mass and logP of the molecule and displays it on the Sweet spot diagram, optionally comparing with the pinned structure. http://www.nature.com/nrd/journal/v11/n5/full/nrd3701.html",
	sortOrder: 12
};