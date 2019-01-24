/*!
 * Pipeline Pilot protocol plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const Q = require("q");
const _ = require("lodash");
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
		url: server + "/auth/launchjob/Protocols/Web%20Services/MarvinLive/Rxn_protocol",
		form: {
			input: mrvSource,
			_blocking: true,
			_streamData: "*",
			_format: "json"
		},
		json: true,
		auth: credentials
	}).then((response) => {
		response.images = [];

		_.each(response.Reaction, (reactionMRV, i) => {
			response.Reaction[i] = reactionMRV.replace(/mrvMap="[^"]+"/g, "");
		});

		const imagePromises = _.map(response.Reaction, (reactionMRV, i) => {

			return mlutils.getImage(reactionMRV, 600, 200).then((image) => {
				response.images[i] = "data:image/jpeg;base64," + image.image.image;
			});
		});

		return Q.allSettled(imagePromises).then(() => response);

	}).then((response) => {

		const results = {
			client: {
				hits: _.map(response.Reaction, (reaction, i) => ({
					reaction: reaction,
					image: response.images[i],
					patentId: response.patent_ID[i]
				}))
			},
			report: {
				"Patent ID": response.patent_ID.join(", ")
			}
		};
		results.client.page = 1;

		return results;
	});

}


module.exports = {
	name: "pp-rxn-search",
	label: "Reactions in patents",
	update: update,
	templateFile: "pp-reaction-search.template.html",
	domains: ["demo", "internal"],
	sortOrder: 440
};