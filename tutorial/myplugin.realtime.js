/*!
 * my realtime plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

var Q = require("q");
var request = require("request");

var myTemplate = "<div>{{client.smiles}}</div>";


module.exports = {
	domains: ["sso"],
	name: "myPlugin",
	label: "My Plugin",
	template: myTemplate,
	update: function(mrvSource) {

	var dfd = Q.defer();

	request.post({
		url: "https://plexus.chemaxon.com/rest-v0/util/calculate/stringMolExport",
		body: {
			structure: mrvSource,
			parameters: "smiles"
		},
		json: true
	}, function(err, res, body) {
		if (err) {
			dfd.reject(err);
		}
		dfd.resolve({
			smiles: body
		});
	});
		

	return dfd.promise;

	}
};