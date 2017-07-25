/*!
 * Utilities
 * Commonly used functions in Marvin Live plugins
 * @license MIT
 */

"use strict";

const request = require("request").defaults({ jar: true });
const _ = require("lodash");

const JCWSURL = "http://localhost:8080/webservices/";


//configuration
const convertUrl = JCWSURL + "rest-v0/util/calculate/stringMolExport";
const convertBody = {
	"structure": "",
	"parameters": ""
};

const imageUrl = JCWSURL + "rest-v0/util/detail";
const imageBody = {
	"structures": [{"structure": ""}],
	"display": {
		"include": ["image"],
		"parameters": {
			"image": {
				"width": 280,
				"height": 150,
				"type": "jpeg"
			}
		}
	}
};


function req(data, baseRequest) {
	
	let requestLib = request;
	if (baseRequest) {
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

			if (err || !res || res.statusCode < 200 || res.statusCode >= 300) {
				if (!res) {
					console.log(err);
					console.log("%s %s no response", data.method, data.url);
				} else {
					if (res.request) {
						console.log(res.request.headers);
						console.log(res.request.body);
					}
					console.log("\n\n%s %s", res.statusCode, data.url);
					console.log(res.headers);
					console.log(res.body);
				}				
				reject(err);
			}
			resolve(body);
			
			if (+new Date() - start > 2 * 1000) {
				console.log("Slow request: %s %s (%s ms)", data.method, data.url, (+new Date() - start));
			}
			
		});

	});
}

function get(data, lib) {
	data.method = "GET";
	return req(data, lib);
}

function post(data, lib) {
	data.method = "POST";
	return req(data, lib);
}

//convert an chemical structure to a different format
function convert(mrvSource, toFormat) {
	const body = _.cloneDeep(convertBody);
	body.parameters = toFormat;
	body.structure = mrvSource;
	return post({ url: convertUrl, json: body });
}

//generate a base64 encoded image for a given structure
function getImage(structure, width, height) {
	const body = _.cloneDeep(imageBody);
	body.structures[0].structure = structure;
	if (width && height) {
		body.display.parameters.image.width = width;
		body.display.parameters.image.height = height;
	}
	return post({ url: imageUrl, json: body }).then((value) => value.data[0]);
}

//generate an image content URL for a list of structures
function getImageURLs(structures, width, height, additionalLog) {

	const body = _.cloneDeep(imageBody);
	body.structures = _.map(structures, (structure) => ({
		structure
	}));
	body.display.parameters.image.returnImage = false;
	if (width && height) {
		body.display.parameters.image.width = width;
		body.display.parameters.image.height = height;
	}
	return post({ url: imageUrl, json: body }).then((images) => {
		//strip the base of the URL to allow ML properly proxying the request
		//without this, the image request might be blocked as unsecure request
		//or simply not reach the webservices server directly from the browser		
		return _.map(images.data, (structureDesc) => structureDesc.image.imageUrl.replace(JCWSURL, "/"));
	});
}


module.exports = {
	JCWSURL: JCWSURL,
	get: get,
	post: post,
	req: req,
	convert: convert,
	getImage: getImage,
	getImageURLs: getImageURLs
};