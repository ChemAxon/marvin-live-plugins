/*!
 * ChemAxon Structure Checker realtime plugin
 * Marvin Live realtime plugin example
 * @license MIT
 */

"use strict";

const _ = require("lodash");
const mlutils = require("./ml-utils");
const fs = require("fs");


//absolute path to xml file
const checkerConfigLocation = process.env["CHECKER_CONFIG"];


const url = mlutils.JCWSURL + "rest-v0/util/calculate/structureChecker";
const postBody = {
	structure: null,
	parameters: {
		checkerXML: null
	}
};


const JCWS_STR_CHK_NO_FIX = "fix was unsuccessful";


const grats = ["Super!", "You’ve got your brain in gear today.", "Good thinking.", "That’s good!", "Excellent!", "Wonderful!", "That’s a real work of art.", "Good work!", "Superb!", "Exactly right!", "You did that very well.", "Perfect!", "You are doing a good job!", "That’s it!", "Keep it up!", "Outstanding!", "You’re really improving.", "I knew you could do it.", "Fantastic!", "Couldn’t have done it better myself.", "Now that’s what I call a fine job.", "That looks like it is going to be a great paper.", "You’re on the right track now.", "Good job!", "That’s really nice."];


async function getCheckerConfig() {
	const buf = await fs.promises.readFile(checkerConfigLocation);
	return buf.toString();
}


async function updateCheckerConfig() {
  console.log("structure-checker - updating central checker config");
  try {
		const newCheckerConfig = await getCheckerConfig();
  	console.log("structure-checker - updated central checker configs");
  	postBody.parameters.checkerXML = newCheckerConfig;
  } catch (err) {
    console.log("structure-checker - couldn't update central checker config");
    console.log(err);
  }
}


setImmediate(() => {
  updateCheckerConfig();
});
setInterval(() => {
  updateCheckerConfig();
}, 5 * 60 * 60 * 1000);


async function checkStructure(structure) {

	//clone the request body to not interfere with other requests
	const requestBody = _.cloneDeep(postBody);

	//add structure to request
	requestBody.structure = structure;

	const results = await mlutils.post({
		url: url,
		json: requestBody
	});

	const issues = [];
	let fixedStructure;
	let fixPossible = false;

	if (results.headers) {
		_.each(results.headers, (header, headerName) => {
			if (headerName === "result") {
				fixedStructure = _.get(results[headerName], "structureData.structure");
				return;
			}
			if (results[headerName].errorMessage !== JCWS_STR_CHK_NO_FIX) {
				fixPossible = true;
			}
			issues.push(results[header.name]);
		});
	}

	return {issues, fixedStructure, fixPossible};
}


async function update(structure) {

	const results = await checkStructure(structure);

	let goodJob;
	if (!results.issues.length) {
		const random = _.random(0, 200);
		if (random < grats.length) {
			goodJob = grats[random];
		}
	}

	return {
		client: {
			issues: results.issues,
			fixedStructure: results.fixedStructure,
			fixPossible: results.fixPossible,
			goodJob
		},
		report: {
			Issues: results.issues.length
		}
	};
}


module.exports = {
	name: "structureChecker",
	label: "Structure Checker",
	templateFile: "structure-checker.template.html",
	update: update,
	domains: ["*"],
	docs: "Checks the drawing quality of chemical structures using predefined rules.",
	sortOrder: 109,
	notifications: "client.issues.length > 0"
};