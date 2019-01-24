/*!
 * Reaxys substance DB search plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const Q = require("q");
const xmlbuilder = require("xmlbuilder");
const xmldom = require("xmldom");
const xpath = require("xpath");
const mlutils = require("./ml-utils");
const url = require("url");
const queryString = require("querystring");
const fs = require("fs");
const path = require("path");


const credentials = {
	apikey: process.env["REAXYS_APIKEY"],
	username: process.env["REAXYS_USERNAME"],
	password: process.env["REAXYS_PASSWORD"]
};


const docs = fs.readFileSync(path.join(__dirname, "/reaxys.docs.txt")).toString();


const reaxysUrl = process.env["REAXYS_API"] || "https://www.reaxys.com/reaxys/api";
const hopIntoUrl = process.env["REAXYS_HOPINTO"] || "https://new.reaxys.com/reaxys/secured/hopinto.do";

const searchTypeKeywords = {
	"Substructure": "substructure",
	"Substructure with related Markush": "substructure",
	"Similarity": "similarity",
	"Exact match": "exact"
};

//similarity threshold is still defined as number but GUI uses scopes
//empirically all values in 81-99 range return the same result
//61-80 similarly, so I picked the lowest numbers
const similarityScopeToThresholdMapping = {
	"Position/Stereo Isomers": 81,
	"Near": 61,
	"Medium": 41,
	"Wide": 21,
	"Widest": 1
};


const similarityScopeToHopintoMapping = {
	"Position/Stereo Isomers": "Positional",
	"Near": "Near",
	"Medium": "Medium",
	"Wide": "Wide",
	"Widest": "Widest"
};

const ides = ["IDE.XRN", "IDE.HASBIO"];


function login() {

	const body = xmlbuilder.create("xf", {
		sysID: "rx.dtd"
	}).ele({
		request: {
			"@caller": credentials.apikey,
			"statement": {
				"@command": "connect",
				"@username": credentials.username,
				"@password": credentials.password
			}
		}
	});

	console.log("Outgoing login request", body.end());

	return mlutils.post({ url: reaxysUrl, body: body.end() })
		.then((results) => {
			console.log("Login response", results);
			return results;
		})
		.catch(() => {
			console.log("Couldn't log in to Reaxys", arguments);
		});
}


function generateImages(details, enableHitHighlight) {
	if (details.hits.length) {


		const structures = _.map(details.hits, (item) => {
			if (enableHitHighlight) {
				return _.first(item.structures);
			} else {
				return _.last(item.structures);
			}
		});


		return mlutils.getImageURLs(structures).then((images) => {
			_.each(images, (image, index) => {
				details.hits[index].base64image = image;
			});
			return details;
		});
	} else {
		return details;
	}
}


function generateTiming(times) {

	const durations = [];
	_.each(times, (timing, index) => {
		if (index === 0) {
			return;
		}
		durations.push(timing - times[index - 1]);
	});

	const timing = {
		times: durations,
		total: _.sum(durations),
		parts: _.map(durations, (duration) => 100 * duration / Math.max(2000, _.sum(durations)))
	};

	return timing;
}


function extractResultname(searchResponse) {
	const doc = new xmldom.DOMParser().parseFromString(searchResponse);
	const resultname = xpath.select("//resultname/text()", doc).toString();

	if (!resultname) {
		console.log("Resultname appears empty", searchResponse);
	} else {
		console.log("Search response available under resultname", resultname);
	}

	return resultname;
}


function retrieveData(resultname) {

	const body = xmlbuilder.create("xf", {
		sysID: "rx.dtd"
	}).ele({
		request: {
			"@caller": credentials.apikey,
			"statement": {
				"@command": "select"
			},
			"select_list": [{
				"select_item": "FA"
			}, {
				"select_item": "IDE"
			}, {
				"select_item": "YY"
			}],
			"from_clause": {
				"@resultname": resultname,
				"@first_item": 1,
				"@last_item": 20
			}
		}
	});

	console.log("Outgoing select request", body.end());

	return mlutils.post({ url: reaxysUrl, body: body.end() });

}

function extractHitCount(xml) {
	const doc = new xmldom.DOMParser().parseFromString(xml);

	const hitCount = xpath.select1("//resultsize/text()", doc);
	if (hitCount) {
		return hitCount.toString();
	}
}


function extractHitDetails(xml) {

	const doc = new xmldom.DOMParser().parseFromString(xml);
	const details = {};

	const hitCount = xpath.select1("//resultsize/text()", doc);
	if (hitCount) {
		details.hitCount = hitCount.toString();
	}
	details.displayHitCount = Math.min(details.hitCount || 0, 20);

	const resultName = xpath.select1("//resultname/text()", doc);
	if (resultName) {
		details.resultName = resultName.toString();
	}

	const hits = xpath.select("//substance", doc);
	details.hits = _.map(hits, (hit) => {

		const item = {};

		//find all the IDEs
		item.ide = {};
		_.each(ides, (ideId) => {
			const node = xpath.select1(".//" + ideId, hit);
			if (node) {
				//choose textContent instead of a text() xpath query to
				//not have to merge inner tags like <i> on IDE.CN
				item.ide[ideId] = node.textContent;
			}
		});

		//multiple mol files are returned, the first is Mol v3000 when colored
		const structures = xpath.select(".//YY.STR", hit);
		item.structures = _.map(structures, (structure) => structure.textContent);

		return item;

	});

	return details;
}


//perform a substance search with a MOL formatted structure
//for keywords see Reaxys API manual.pdf page 62
function search(mol, searchOptions) {

	const escapedMol = mol.replace("'", "\\'");
	const keywords = searchOptions.keywords.join(",");
	const where = [`structure('${escapedMol}', '${keywords}')`];

	const body = xmlbuilder.create("xf", {
		sysID: "rx.dtd"
	}).ele({
		request: {
			"@caller": credentials.apikey,
			"statement": {
				"@command": "select"
			},
			"select_list": {
				"select_item": ""
			},
			"from_clause": {
				"@dbname": "RX",
				"@context": searchOptions.context
			},
			"where_clause": {
				"#text": _.concat(where, searchOptions.filters).join(" AND ")
			},
			"order_by_clause": {
				"#text": "IDE.NUMREF DESC"
			},
			"options": {
				"#text": "WORKER,NO_CORESULT"
			}
		}
	});

	console.log("Outgoing search request", body.end());

	return mlutils.post({ url: reaxysUrl, body: body.end() });
}

//see Link-In-new-Reaxys.pdf
//<Reaxys-link-in-URL>?context=<context>&query=<query>&options=<options>&qname=<query name>&ln=
function createHopintoLink(smiles, searchOptions) {

	const filters = [];
	if (smiles) {
		filters.push(`SMILES='${smiles}'`);
	}
	_.each(searchOptions.filters, (filter) => {
		filters.push(filter);
	});

	const requestParameters = {
		context: searchOptions.context,
		query: filters.join(" AND "),
		options: searchOptions.keywords.join(","),
		qname: "",
		SSOption: searchOptions.SSOption,
		ln: 1
	};
	return url.resolve(hopIntoUrl, `?${queryString.encode(requestParameters)}`);
}


function update(mrvSource) {


	//prepare search options
	const searchType = this.settings && this.settings["Search type"] || "Substructure";
	const searchOptions = {
		keywords: [searchTypeKeywords[searchType]],
		filters: []
	};

	if (searchType === "Similarity") {
		const similarityScope = this.settings && this.settings["Similarity scope"] || "Near";
		const numericSimilarityThreshold = similarityScopeToThresholdMapping[similarityScope];
		searchOptions.keywords[0] = `similarity=${numericSimilarityThreshold}`;
		const hopintoSimilarityScope = similarityScopeToHopintoMapping[similarityScope];
		searchOptions["SSOption"] = `similarity${hopintoSimilarityScope}`;
	}

	if (searchType === "Substructure with related Markush") {
		searchOptions.keywords.push("markush");
	}

	if (this.settings && this.settings["Filter hits with bioactivity facts"]) {
		searchOptions.filters.push("IDE.HASBIO>0");
	}

	//Reaxys API manual.pdf page 7
	const substanceSearchOptions = _.extend({}, searchOptions, { context: "S" });
	const citationSearchOptions = _.extend({}, searchOptions, { context: "C" });


	//start logging time spent
	const startTime = +new Date();
	const times = [startTime];

	let smiles;
	let citationHits;

	return Q.all([
		mlutils.convert(mrvSource, "sdf"),
		mlutils.convert(mrvSource, "smiles"),
		login()
	]).then((results) => {

		times.push(new Date().getTime());
		smiles = results[1];

		return Q.all([
			search(results[0], substanceSearchOptions),
			search(results[0], citationSearchOptions)
		]);

	}).then((results) => {

		times.push(+new Date());
		const resultName = extractResultname(results[0]);
		citationHits = extractHitCount(results[1]);
		return retrieveData(resultName);

	})
	.then((details) => extractHitDetails(details))
	.then((details) => {

		times.push(+new Date());
		const enableHitHighlight = searchType !== "Exact match";
		return generateImages(details, enableHitHighlight);

	})
	.then((details) => {

		times.push(+new Date());

		details.citationHitCount = citationHits;


		//generate hopinto link
		details.hopinto = createHopintoLink(smiles, substanceSearchOptions);
		details.hopintoType = searchType.toLowerCase();


		//display performance details
		if (!this.settings || this.settings["Show performance details"] !== false) {
			const timing = generateTiming(times);
			details.timing = timing;
		}


		return details;

	});

}


module.exports = {
	domains: ["disabled"],
	name: "reaxys",
	label: "Reaxys hits",
	templateFile: "reaxys.template.html",
	update: update,
	settings: [{
		label: "Show performance details",
		type: "boolean",
		default: true
	}, {
		label: "Search type",
		type: "enum",
		default: "Substructure",
		values: ["Substructure", "Substructure with related Markush", "Similarity", "Exact match"]
	}, {
		label: "Similarity scope",
		type: "enum",
		default: "Near",
		values: ["Position/Stereo Isomers", "Near", "Medium", "Wide", "Widest"]
	}, {
		label: "Filter hits with bioactivity facts",
		type: "boolean",
		default: false
	},],
	docs: docs,
	sortOrder: 40
};