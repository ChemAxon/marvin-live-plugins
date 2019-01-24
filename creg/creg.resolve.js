/*!
 * ChemAxon Compound Registration ID importer
 * Marvin Live resolver plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const cregBase = require("./creg-base");
const mlutils = require("./ml-utils");

function resolve(id) {

	let req;

	return cregBase.login().then((baseRequest) => {

		req = baseRequest;

		return mlutils.get({
			url: cregBase.baseUrl + "/rest/amendmentService/tree",
			json: true,
			qs: {
				id: id
			}
		}, req);

	}).then((treeResults) => {

		let type;

		//is PCN?
		if (treeResults.pcn.toLowerCase() === id.toLowerCase()) {
			type = "PCN";
		//could be a CN
		} else {
			_.each(treeResults.childNodes, (node) => {
				if (node.cn.toLowerCase() === id.toLowerCase()) {
					type = "CN";
				}
			});
		}
		//otherwise it must be an LN
		if (!type) {
			type = "LN";
		}

		return mlutils.get({
			url: cregBase.baseUrl + "/rest/structureService/registryStructure",
			json: true,
			qs: {
				format: "mrv",
				id: id,
				idType: type
			}
		}, req);

	}).then((data) => {

		if (data.structureMolfile) {
			return data.structureMolfile;
		} else {
			throw new Error();
		}

	});
}

module.exports = {
	name: "creg",
	label: "CReg",
	resolve: resolve,
	domains: ["disabled"]
};