"use strict";

const mlutils = require("./ml-utils");

const convertUrl = mlutils.JCWSURL + "rest-v0/utilext/convertStream/tsv";

async function convert(mrv) {
	return mlutils.post({
		url: convertUrl,
		body: mrv
	});
}


async function generate(roomData) {

	const mrvExporter = this.exporters.mrv;
	const mrv = await mrvExporter.generate.call(this, roomData);
	return convert(mrv);

}

module.exports = {
	name: "smiles",
	label: "SMILES",
	generate: generate,
	domains: ["*"],
	sortOrder: 70
};