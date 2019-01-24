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
		"include": ["logD"]
	}
};


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
	const filteredData = _.get(data, "logD.chartData.values");
	return filteredData;
}


async function update(structure, baseline) {

	const calculations = [calculate(structure)];
	if (baseline) {
		calculations.push(calculate(baseline));
	}

	const values = await Promise.all(calculations);

	const spreadsheetValues = _.chain(values[0]).clone().toArray().map((pair) => ({
		pH: pair.pH,
		values: [pair.logD]
	})).each((pair, index) => {
		if (values[1] && values[1][index]) {
			pair.values.push(values[1][index].logD);
		}
	}).filter((pair) => {
		return _.includes([1.5, 5, 6.5, 7.4], pair.pH);
	}).map((pair) => ({
		label: "pH" + pair.pH,
		values: pair.values
	})).value();

	const chartValues = _.chain(values[0]).clone().toArray().map((pair) => ({
		pH: pair.pH,
		values: [pair.logD]
	})).each((pair, index) => {
		if (values[1] && values[1][index]) {
			pair.values.push(values[1][index].logD);
		}
	}).filter((pair) => {
		return pair.pH % 0.5 === 0;
	}).map((pair) => ({
		key: pair.pH,
		values: pair.values
	})).sortBy((pair) => parseFloat(pair.key))
	.value();

	const chartData = [[]];
	if (values[1]) {
		chartData.push([]);
	}
	_.each(chartValues, (pair) => {
		chartData[0].push(pair.values[0]);
		if (pair.values.length > 1) {
			chartData[1].push(pair.values[1]);
		}
	});

	const client = {
		spreadsheet: spreadsheetValues,
		chart: {
			labels: _.map(chartValues, (pair) => `${parseFloat(pair.key).toFixed(1)}`),
			data: chartData,
			series: ["Current", "Pinned"],
			options: {
				scales: {
					xAxes: [{
						scaleLabel: {
							display: true,
							labelString: "pH"
						},
						ticks: {
							min: 0,
							max: 14,
							maxTicksLimit: 15
						}
					}]
				},
				elements: {
					line: {
						tension: 0
					},
					point: {
						radius: 0
					}
				}
			},
			chartDatasetOverride: [
				{
					label: "cLogD",
					fill: false
				},
				{
					label: "cLogD",
					fill: false
				}
			]
		},
		hasPinnedValues: !!baseline
	};

	const report = {};
	_.each(spreadsheetValues, (pair) => {
		report[pair.label] = pair.values[0];
	});

	return {
		client,
		report
	};
}


//export the necessary plugin properties, ie: this is the plugin interface
module.exports = {
	name: "logd-chart",
	label: "cLogD",
	templateFile: "logdchart.template.html",
	update: update,
	domains: ["*"],
	docs: "Calculates and displays a pH-logD chart, optionally comparing with the pinned structure.",
	sortOrder: 12
};