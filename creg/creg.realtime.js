/*!
 * ChemAxon Compound Registration plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const Q = require("q");
const _ = require("lodash");
const cregBase = require("./creg-base");
const mlutils = require("./ml-utils");


function update(mrvSource) {

	return Q.when(cregBase.login()).then((baseRequest) => {
		return mlutils.post({
			url: cregBase.baseUrl + "/rest/searchService/search",
			json: {
  			conditions: [],
  			options: {
  				searchLevel: "version",
  				markush: "OFF",
  				searchType: "SIMILARITY",
					dissimilarityThreshold: 0.5,
  				tautomer: "OFF",
  				stereo: "ON"
  			},
  			queryStructure: mrvSource,
  			resultFields: [
          {fieldName:"structure", additional:false},
          {fieldName:"mf", additional:false},
          {fieldName:"mwtStructure", additional:false},
          {fieldName:"cst", additional:false},
          {fieldName:"pcn_reg", additional:false},
          {fieldName:"parentRegisteredBy", additional:false},
          {fieldName:"parentCreatedOn", additional:false}
        ],
  			resultFormat: "mrv",
  			ordering: {
  				orderingParams: []
  			},
  			pagination: {
  				offset: 0,
  				limit: 20
  			}
  		}
		}, baseRequest);
	}).tap((results) => {

		results.baseUrl = cregBase.baseUrl;

		const structures = _.map(results.resultsPage, (item) => item.searchColumns.structure);

		return mlutils.getImageURLs(structures, 280, 150).then((imageUrls) => {
      _.each(imageUrls, (imageUrl, index) => {
        results.resultsPage[index].imageUrl = imageUrl;
      });
    });

	}).then((searchResults) => {

		const results = {
			client: searchResults,
			report: {
				Matches: searchResults.resultsPage.length
			}
		};

		return results;
	});

}

module.exports = {
	name: "creg",
	label: "Compound Registration",
	update: update,
	templateFile: "creg.template.html",
	domains: ["internal", "demo"],
	sortOrder: 80,
	docs: "Searches the compouned registry using substructure search."
};