/*!
 * Unichem plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

var Q = require("q");
var mlutils = require("./ml-utils");

var unichemAPI = process.env["UNICHEM_API"] || "https://www.ebi.ac.uk/unichem/rest";
var unichemLookup = `${unichemAPI}/inchikey/`;
var unichemSources = `${unichemAPI}/sources/`;


//generate links
function generateURL(compoundDetails) {

	var sourcePromises = [];

	//take only the first 5 links
	compoundDetails.slice(0, 5).forEach(function(details, i) {

		//load the necessary source information
		var prom = getSourceDetails(details.src_id).then(function(source) {

			//generate url
			var url;
			if (source.base_id_url_available === "1") {
				url = source.base_id_url;
				if (source.aux_for_url === "1") {
					url += details.aux_src;
				} else {
					url += details.src_compound_id;
				}
			} else {
				url = source.src_url;
			}

			//return information for display
			return {
				url: url,
				id: details.src_compound_id,
				label: source.name_label
			};

		});
		sourcePromises.push(prom);
	});

	//when all sources loaded
	return Q.allSettled(sourcePromises).then(function(results) {

		//simplify the data structure
		var values = results.map(function(result) {
			if (result.state === "fulfilled") {
				return result.value;
			}
		});

		//also provide total hit count
		return {
			urls: values,
			count: compoundDetails.length
		};

	});


}

//load unichem source information for URL generation
function getSourceDetails(source) {
	var page = unichemSources + source;
	return mlutils.get({url: page, json: true}).then(function(results) {
		return results[0];
	});
}

//find structure in unichem by inchikey (exact match)
function lookup(inchikey) {
	var page = unichemLookup + inchikey.replace("InChIKey=", "").trim();
	return mlutils.get({url: page, json: true});
}


var update = function(mrvSource) {

	return mlutils.convert(mrvSource, "inchikey").then(function(inchikey) {

		return lookup(inchikey);

	}).then(function(results) {

		return generateURL(results);

	});
};


module.exports = {
	"name": "unichem",
	"label": "UniChem",
	"domains": ["*"],
	"templateFile": "unichem.template.html",
	"update": update,
	"sortOrder": 91
};