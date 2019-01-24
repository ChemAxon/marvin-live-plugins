/*!
 * Compound Registration bulkloader plugin
 * Marvin Live export plugin example
 * 
 * in compreg configuration disable ValidateLNBRef to allow generated Unique ID
 * or add ^[A-Z0-9]+-[A-Z0-9]+-[0-9]{1,3}$ as ValidateLNBRefRegexp
 * 
 * structures are registered with ELNB source
 *
 * @license MIT
 */


"use strict";

const _ = require("lodash");
const cregBase = require("./creg-base");
const mlutils = require("./ml-utils");
const Q = require("q");

function search(structure, requestLib) {
	const requestBody = {
		conditions: [],
		options: {
			searchLevel: "PARENT",
			markush: "OFF",
			searchType: "DUPLICATE",
			dissimilarityThreshold: 0.8,
			tautomer: "OFF",
			stereo: "ON"
		},
		queryStructure: structure,
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
	};
	return mlutils.post({
			url: `${cregBase.baseUrl}/rest/searchService/search`,
			json: requestBody
	}, requestLib).then((results) => {
	
		if (!results || _.isEmpty(results.resultsPage)) {
			throw new Error("Idea doesn't exist");
		}
		const [match] = results.resultsPage;
		return match.id;
	});
}

function checkOrRegister(idea, requestLib) {
	return search(idea.structure, requestLib)
		.catch(() => register(idea, requestLib))
		.then((id) => id);
}

function register(idea, requestLib) {
	console.log("registering", idea);
	const requestBody = {
		lnbRef: "",
		source: "MARVINLIVE",
		structure: {
				additionalData: [{
						name: "projectName",
						value: idea.project,
				}, {
						name: "roomName",
						value: idea.roomName
				}],
				components: [{
						creatorId: idea.author,
						molfile: idea.structure
				}],
				saltsAndSolvates: [],
				multiplicity: 1,
				creatorId: idea.author,
				source: "MARVINLIVE",
				structureType: "SINGLE"
			},
			virtualCompound: true
		};

		return mlutils.post({
			url: `${cregBase.baseUrl}/rest/registrationService/autoRegister`,
			json: requestBody
		}, requestLib)
			.then((submission) => _pollForSubmission(submission.submissionId, requestLib))
			.then((id) => id);
}

function _pollForSubmission(submissionId, requestLib) {
	return _getSubmissionResults(submissionId, requestLib).then((response) => {
		const status = _.get(response, "status.status");
		if (!status || status === "Inprogress") {
			return Q.delay(250).then(() => _pollForSubmission(submissionId, requestLib));
		} else {
			return _.get(response, "ids.pcn");
		}
	});
}

function _getSubmissionResults(submissionId, requestLib) {
	return mlutils.get({
		url: `${cregBase.baseUrl}/rest/registrationService/registrationResult?submissionId=${submissionId}`,
		json: true
	}, requestLib);
}


function generate(meetingData) {

	const name = this.roomName;
	const project = this.project;

	return cregBase.login().then((baseRequest) => {
		
		const promises = _.map(meetingData.snapshots, (snapshot) => checkOrRegister({
			project,
			roomName: name,
			structure: snapshot.structure,
			author: snapshot.author
		}, baseRequest));
		
		return Q.allSettled(promises);

	}).then((values) => {

		return {
			successCount: _.filter(values, (fulfillMent) => fulfillMent.state === "fulfilled").length,
			ids: _.map(values, (fulfillMent) => fulfillMent.value),
			baseUrl: cregBase.baseUrl
		};

	}).catch((err) => {
		
		console.log("creg-export failed", err.stack);
		return `Submission to registration system failed. You can investigate the cause on the dashboard: ${cregBase.baseUrl}/client/index.html`;
	});

}

module.exports = {
	name: "creg",
	label: "Compound Registration",
	generate: generate,
	domains: ["ugm", "internal"],
	sortOrder: 80,
	returnType: "message",
	templateFile: "creg-export.template.html"
};