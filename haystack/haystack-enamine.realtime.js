/*!
 * haystack REST V1 WS plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");


// e.g. "http://haystack.bph.cxn:8889/rest-v1/db/additional/enamine"
const dbTable = process.env["ENAMINE_RESTV1_TABLE"];


const searchTypes = {
	Substructure: "substructure",
	Similarity: "similarity",
	"Exact match": "duplicate"
};


async function wsSearch(type, queryMolecule) {

	if (!_.includes(searchTypes, type)) {
		throw new TypeError("unsupported search type", type, searchTypes);
	}

	const similarityThreshold = 0.8;
	const results = await mlutils.post({
		url: `${dbTable}?search=${type}`,
		json: {
			hitCount: 20,
			molecule: queryMolecule,
			similarityThreshold: similarityThreshold
		}
	});

	return _.map(results.hits, (hit) => ({
		molecule: hit.molecule,
		enamine: hit.additionalData.idnumber
	}));

	//returns
	/*
	const rows = {
	  "hits": [
	    {
	      "id": 228097417,
	      "molecule": "CSC1=CC=CC=C1",
	      "additionalData": {
	        "idnumber": "PV-001915358083"
	      }
	    },
	    {
	      "id": 123800777,
	      "molecule": "C1=CC=C(C2=CC=CC=C2)C=C1",
	      "additionalData": {
	        "idnumber": "Z57127482"
	      }
	    },
	    {
	      "id": 228097418,
	      "molecule": "CCSC1=CC=CC=C1",
	      "additionalData": {
	        "idnumber": "PV-001915358084"
	      }
	    },
	    {
	      "id": 228170465,
	      "molecule": "CSCC1=CC=CC=C1",
	      "additionalData": {
	        "idnumber": "PV-001915631831"
	      }
	    },
	    {
	      "id": 6742682,
	      "molecule": "CSCC1=CC=C(C)C=C1",
	      "additionalData": {
	        "idnumber": "Z599629786"
	      }
	    },
	    {
	      "id": 5741370,
	      "molecule": "CSCC1=CC=C(CSC)C=C1",
	      "additionalData": {
	        "idnumber": "Z599629640"
	      }
	    },
	    {
	      "id": 228120141,
	      "molecule": "CSC1=CC=C(C)C=C1",
	      "additionalData": {
	        "idnumber": "PV-001915447185"
	      }
	    },
	    {
	      "id": 2832477,
	      "molecule": "CC(C)SC1=CC=CC=C1",
	      "additionalData": {
	        "idnumber": "Z53861505"
	      }
	    },
	    {
	      "id": 141255397,
	      "molecule": "CC1=CC=CC=C1C1=CC=CC=C1",
	      "additionalData": {
	        "idnumber": "Z2687608449"
	      }
	    },
	    {
	      "id": 8901253,
	      "molecule": "CSC1=CC=C2C=CC=CC2=C1",
	      "additionalData": {
	        "idnumber": "Z17458783"
	      }
	    }
	  ]
	};*/
}

async function search(type, query) {
	return wsSearch(type, query);
}


async function update(mrvSource) {

	const startTime = +new Date();
	const times = [startTime];

	const searchType = this.settings && this.settings["Search type"] || "Substructure";

	const rows = await search(searchTypes[searchType], mrvSource);
	times.push(+new Date());

	times.push(+new Date());

	const images = await mlutils.getImageURLs(_.map(rows, (row) => row.molecule));
	times.push(+new Date());

	_.each(images, (image, index) => {
		rows[index].base64image = image;
	});


	const durations = [];
	_.each(times, (timing, index) => {
		if (index === 0) {
			return;
		}
		durations.push(timing - times[index - 1]);
	});
	console.log("haystack-enamine took", durations);

	return {
		client: {
			rows: rows,
			timing: {
				times: durations,
				total: _.sum(durations),
				parts: _.map(durations, (timing) => 100 * timing / Math.max(2000, _.sum(durations)))
			}
		},
		report: {}
	};

}


//export the necessary plugin properties
module.exports = {
	name: "haystack-enamine",
	label: "Project Haystack (Enamine)",
	templateFile: "haystack-search.template.html",
	docs: "Runs a chemical structure search and fetches the first 20 results. To show off the technology a bit, 3 main components of the plugin's work are timed. Search duration means substructure/similarity/exact match search with screening and atom-by-atom search. Retrieving metadata means fetching remote database IDs and molecule sources for each hit. Image generation means creating PNG and cleaning the molecule to 2D some content sources.",
	update: update,
	domains: ["internal"],
	sortOrder: 171,
	settings: [{
		label: "Search type",
		type: "enum",
		default: "Substructure",
		values: ["Substructure", "Exact match", "Similarity"]
	}]
};