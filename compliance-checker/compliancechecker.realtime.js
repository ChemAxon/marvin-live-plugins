/*!
 * ChemAxon Compliance Checker v2 plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");


const credentials = {
	username: process.env["CC_USERNAME"],
	password: process.env["CC_PASSWORD"]
};


//"https://cchecker-demo.chemaxon.com";
const ccServer = process.env["CC_SERVER"];

async function update(mrvSource) {

	const data = await mlutils.post({
		url: ccServer + "/cc-bigdata/integration/check",
		auth: credentials,
		json: {
			input: mrvSource
		}
	});

	if (!_.get(data, "simpleResponses[0]")) {
		return {};
	}
	const results = _.chain(data.simpleResponses[0])
		.slice(0, 5)
		.map((result) => _.pick(result, "molName", "categoryName", "legislativeLinks"))
		.value();

	return {
		client: {
			server: ccServer,
			hits: results,
			total: data.simpleResponses[0].length
		},
		report: {
			"Issues": data.simpleResponses[0].length,
			"Last checked": new Date().toDateString()
		}
	};

}


module.exports = {
	name: "compliance-checker",
	label: "Compliance Checker",
	templateFile: "compliancechecker.template.html",
	domains: ["*"],
	update: update,
	sortOrder: 100,
	docs: "Checks the molecule in the legislation database of Compliance Checker using superstructure search. The resulting legislations' link is displayed.",
};