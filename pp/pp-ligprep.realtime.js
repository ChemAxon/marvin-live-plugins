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


function update(mrvSource) {

	//execute the job in blocking mode
	return mlutils.post({
		url: server + "/auth/launchjob/Protocols/Web%20Services/MarvinLive/LigPrep",
		form: {
			inputmol: mrvSource,
			_blocking: true,
			_streamData: "*",
			_format: "json"
		},
		json: true,
		auth: credentials
	}).then((response) => {

		const clientValues = [];
		const reportValues = {};

		return {
			client: {
				values: response.errorMessage
			},
			report: reportValues
		};
	});

}


module.exports = {
	name: "pp-ligprep",
	label: "Ligprep",
	update: update,
	templateFile: "pp-ligprep.template.html",
	domains: ["*"],
	sortOrder: 250
};