/*!
* Utilities
* Commonly used functions in Marvin Live plugins
* @license MIT
*/

"use strict";

const request = require("request").defaults({ jar: true });
const _ = require("lodash");
const util = require("util");

const JCWSURL = process.env["JCWSURL"] || "http://localhost:8080/webservices/";


//configuration
const convertUrl = JCWSURL + "rest-v0/util/calculate/stringMolExport";
const convertBody = {
	"structure": "",
	"parameters": ""
};

const imageUrl = JCWSURL + "rest-v0/util/detail";
const imageBody = {
	"structures": [{"structure": ""}],
	"display":  {
		"include": ["structureData"],
		"parameters": {
			"structureData": "png:-a,w%w%,h%h%,transbg,cpk,wireframe,nosource,marginSize2,maxScale28"
		}
	}
};

async function req(data, baseRequest) {

	let requestLib = request;
	if (baseRequest) {
		console.log("Switching to provided requestLib");
		requestLib = baseRequest;
	}

	if (!data || !data.url) {
		console.log("No URL specified", data);
		console.trace();
	}
	if (!data.method) {
		data.method = "POST";
	}
	console.log("%s %s", data.method, data.url);

	const start = +new Date();
	return new Promise((resolve, reject) => {
		requestLib(data, (err, res, body) => {

			if (err || !res || !(/^2/.test("" + res.statusCode))) {
				if (!res) {
					console.log("%s %s no response", data.method, data.url, err);
				} else {
					console.log(`${res.statusCode} ${data.url}`);
					if (res.request) {
						console.log(`Request headers:\n${util.inspect(res.request.headers)}\nRequest body:\n${util.inspect(res.request.body)}`);
					}
					console.log(`Response headers:\n${util.inspect(res.headers)}\nResponse body:\n${util.inspect(res.body)}`);
				}
				reject({err, body});
			}
			resolve(body);

			if (+new Date() - start > 1000) {
				console.log("Slow request: %s %s (%s ms)", data.method, data.url, (+new Date() - start));
			}

		});

	});
}

async function get(data, lib) {
	data.method = "GET";
	return req(data, lib);
}

async function post(data, lib) {
	data.method = "POST";
	return req(data, lib);
}

//convert an chemical structure to a different format
async function convert(mrvSource, toFormat) {
	const body = _.cloneDeep(convertBody);
	body.parameters = toFormat;
	body.structure = mrvSource;
	return post({ url: convertUrl, json: body });
}

//generate an image content URL for a list of structures
async function getImageURLs(structures, width = 400, height = 260) {

	const body = _.cloneDeep(imageBody);
	body.display.parameters.structureData = body.display.parameters.structureData.replace("%w%", width).replace("%h%", height);
	body.structures = _.map(structures, (structure) => ({
		structure
	}));

	const response = await post({ url: imageUrl, json: body });

	return _.map(response.data, (record, index) => {
		if (!_.get(record, "structureData.binaryStructure")) {
			console.log("no image for ", index);
		}
		return "data:image/png;base64," + record.structureData.binaryStructure;
	});
}


module.exports = {
	JCWSURL: JCWSURL,
	get: get,
	post: post,
	req: req,
	convert: convert,
	getImageURLs: getImageURLs
};