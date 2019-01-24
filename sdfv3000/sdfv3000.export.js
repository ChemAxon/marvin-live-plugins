"use strict";

const mlutils = require("./ml-utils");

const convertUrl = mlutils.JCWSURL + "rest-v0/utilext/convertStream/sdf:V3";

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
	name: "sdfv3000",
	label: "SDF V3000",
	generate: generate,
	filename: "mlreport-%roomName%-%lastActivityDate%.sdf",
	domains: ["*"],
	sortOrder: 72
};