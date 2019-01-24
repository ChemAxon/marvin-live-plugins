"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");
const { Parser } = require("json2csv");

const convertUrl = mlutils.JCWSURL + "rest-v0/utilext/convertStream/smiles:r1";

async function convert(mrv) {
	return mlutils.post({
		url: convertUrl,
		body: mrv
	});
}


function mapSnapshotsToCSVRecords(snapshots, smiles, roomData) {

	const data = _.map(snapshots, (snapshot, index) => {
		const record = {};
		record["Snapshot ID"] = snapshot.uniqueId ? snapshot.uniqueId : (snapshot.snapshotId + 1);
		record["Structure"] = smiles[index];

		if (roomData.project) {
			record["Project"] = roomData.project;
		}

		record["Room"] = roomData.name;
		record["Link"] = roomData.url;
		record["Author"] = snapshot.author;
		record["Time"] = new Date(snapshot.timestamp).toUTCString();

		_.each(snapshot.additionalFields, (value, key) => {
			record[key] = value;
		});

		if (!_.isEmpty(snapshot.data)) {
			_.each(snapshot.data, (values, type) => {

				_.each(values, (value, key) => {
					record[`${key} ${type}`] = value;
				});

			});
		}

		return record;

	});

	const fields = _.chain(data).map((item) => Object.keys(item)).flatten().uniq().value();
	return { fields, data };
}


async function generate(roomData) {

	const mrvExporter = this.exporters.mrv;
	const mrv = await mrvExporter.generate.call(this, roomData);
	const smilesFile = await convert(mrv);

	const smiles = smilesFile.split("\n");

	const {fields, data} = mapSnapshotsToCSVRecords(roomData.snapshots, smiles, roomData);

	const csvParser = new Parser({ fields });
	return csvParser.parse(data);
}

module.exports = {
	name: "csv",
	label: "CSV",
	generate: generate,
	domains: ["*"],
	sortOrder: 71
};