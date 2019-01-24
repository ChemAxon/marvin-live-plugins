/*!
 * Pipeline Pilot protocol plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const mlutils = require("./ml-utils");

const credentials = {
	username: process.env["PIPELINEPILOT_USERNAME"],
	password: process.env["PIPELINEPILOT_PASSWORD"]
};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//"https://pp-demo.chemaxon.com";
const server = process.env["PIPELINEPILOT_SERVER"];


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


function update(mrvSource) {

	//execute the job in blocking mode
	return mlutils.post({
		url: server + "/auth/launchjob/Protocols/Web%20Services/MarvinLive/CarbonEfficiency",
		form: {
			RXNInput: mrvSource,
			_blocking: true,
			_streamData: "*",
			_format: "json"
		},
		json: true,
		auth: credentials
	}).then((response) => {

		const clientValues = [];
		const reportValues = {};

		response["Name"].forEach((componentName, index) => {
			if (componentName.indexOf("Product") !== -1) {
				let value;
				if (response["ProductCarbonEfficiency"][index] === "Not Applicable") {
					value = "N/A";
				} else {
					value = format(parseFloat(response["ProductCarbonEfficiency"][index])) + "%";
				}
				clientValues.push({
					name: componentName,
					value: value
				});
				reportValues["Carbon Efficiency " + componentName] = value;
			}
		});


		return {
			client: {
				values: clientValues
			},
			report: reportValues
		};
	});

}


module.exports = {
	name: "pp-carbon-efficiency",
	label: "Carbon Efficiency (reaction)",
	update: update,
	templateFile: "pp-carbon-efficiency.template.html",
	domains: ["*"],
	sortOrder: 460
};