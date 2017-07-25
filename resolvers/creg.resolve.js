/*!
 * ChemAxon Compound Registration importer
 * Marvin Live resolver plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const cregBase = require("./creg-base");
const mlutils = require("../common/ml-utils");

function resolve(id) {

	let req;
    const format = "mrv";
	
	return cregBase.login().then((baseRequestLibrary) => {

		req = baseRequestLibrary;

		return mlutils.get({
			url: cregBase.baseUrl + "/rest/amendmentService/tree",
			json: true,
			qs: {
				id: id
			}
		}, req);

	}).then((treeResults) => {

		let idType;
		
		//is PCN?
		if (treeResults.pcn.toLowerCase() === id.toLowerCase()) {
			idType = "PCN";
		//could be a CN
		} else {
			_.each(treeResults.childNodes, function(node) {
				if (node.cn.toLowerCase() === id.toLowerCase()) {
					idType = "CN";
				}
			});
		}
		//otherwise it must be an LN
		if (!idType) {
			idType = "LN";
		}

		return mlutils.get({
			url: cregBase.baseUrl + "/rest/structureService/registryStructure",
			json: true,
			qs: {
				format,
				id,
				idType
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
	domains: ["*"]
};