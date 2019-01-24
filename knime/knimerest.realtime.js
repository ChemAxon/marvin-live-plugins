/*!
 * ChemAxon KNIME workflow plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const Q = require("q");
const _ = require("lodash");
const mlutils = require("./ml-utils");

//"http://knime-demo.bph.cxn:8080/com.knime.enterprise.server/rest/v4";
const server = process.env["KNIME_SERVER_RESTAPI"];


const credentials = {
	username: process.env["KNIME_USERNAME"],
	password: process.env["KNIME_PASSWORD"]
};


function update(mrvSource) {

	let jobURL;

	//create a job
	return Q.when(mlutils.post({
		url: server + "/repository/Akos/hERG_web_Tree:jobs",
		auth: credentials
	})).then((data) => {

		const jobDetails = JSON.parse(data);

		jobURL = jobDetails["@controls"]["knime:execute-job"]["href"].replace("{?async}", "");

		//then execute job by sending some input
		return mlutils.post({
			url: jobURL,
			json: {
				//expect Node 57 to be the JSON Input node we need
				//it's possible to make this independent from #57 with
				//jobDetails.inputParameters and a regexp...
				"json-input-57": {
					//id not required with KNIME 4.2
					"id": "json-input",
					"jsonvalue": [{
						"Molecule": mrvSource
					}]
				}
			},
			auth: credentials,
			headers: {
				//KNIME returns Content-Type: application/vnd.mason+json;charset=UTF-8 with KNIME 4.2.3
				Accept: "*/*"
			}
		});

	}).then((results) => {

		//expect Node 58 to be the JSON Output node we need
		const data = _.get(results, "outputValues.json-output-58[0]");

		return {
			client: data,
			report: {
				"Active": data["Tree Ensemble Prediction"],
				"Confidence": data["Tree Ensemble Prediction (Confidence)"],
				"PChemBL": data["PCHEMBL_VALUE"]
			}
		};

	}).catch((err) => Q.reject(err)).finally(function() {

		//clean up the job
		//with KNIME Server 4.2, job-pool is available,
		//so creating and deleting the job is no longer required to execute a workflow
		if (jobURL) {
			mlutils.req({
				url: jobURL,
				method: "DELETE",
				auth: credentials
			});
		} else {
			console.log("knimerest.realtime.js - no job URL so cannot delete");
		}

	});

}

module.exports = {
	name: "knimerest",
	label: "hERG binding",
	update: update,
	templateFile: "knimerest.template.html",
	domains: ["*"],
	sortOrder: 150,
	docs: "Runs a hERG activity prediction using a random forest model built on data published in ChEMBL. The most similar compound's literature reference is returned with its similarity score. The workflow uses KNIME Server."
};