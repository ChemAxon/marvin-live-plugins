/*!
 * Postgres plugin
 * uses JChem Postgres Cartridge 2.0
 * Marvin Live storage plugin example
 * @license MIT
 */

"use strict";

var Q = require("q");
var postgresStorage = require("./psql.storage");

/*
CREATE TABLE IF NOT EXISTS idearepositorymol (
	id  varchar(100) NOT NULL,
    mol  Molecule('sample'),
	originurl  varchar(300) NOT NULL,
    author  varchar(50) NOT NULL,
    task  varchar(200),
	status  text,
	domain  varchar(40) NOT NULL,
    room  varchar(200) NOT NULL,
	timestamp  timestamp
);
CREATE INDEX idearepositorymol_mol_idx ON idearepositorymol USING chemindex(mol);
ALTER TABLE idearepositorymol OWNER TO docker;
*/


//check if a snapshot is saved based on the molecule, domain and room properties
var checkDuplicate = function(snapshot, meetingDetails) {

	var dfd = Q.defer();

	//use chemical structure duplicate filtering on the mol column
	var searchQuery = "SELECT id FROM idearepositorymol WHERE $1::Molecule('sample') |=| mol::Molecule('sample') AND domain = $2 LIMIT 1;";
	var data = [snapshot.structure, meetingDetails.domain];

	postgresStorage.query(searchQuery, data).then(function(result) {
		if (result.rows.length) {
			console.log("this is a match", result.rows[0].id);
			dfd.resolve(result.rows[0].id);
		} else {
			dfd.reject("No matches found.");
		}
	}).catch(function(err) {
		dfd.reject(err);
	});

	return dfd.promise;

};


function getStatus(selectedFlag) {
	return selectedFlag ? "In review" : "In design";
}


//update the snapshot using its id
function updateSnapshot(snapshot, meetingDetails) {

	var updateStmt = "UPDATE idearepositorymol SET task = $3, status = $4 WHERE id = $1 AND domain = $2;";

	var values = [
		meetingDetails.roomName + "-" + (snapshot.snapshotId + 1),
		meetingDetails.domain,
		snapshot.task,
		getStatus(snapshot.selected)
	];

	return postgresStorage.query(updateStmt, values).then(function() {
		console.log("Snapshot successfully updated in psql.idearepositorymol");
	});
}


//save new snapshots with most of their details
var insertSnapshot = function(snapshot, meetingDetails) {

	var dfd = Q.defer();

	var insertStmt = "INSERT INTO idearepositorymol (id, mol, domain, room, originurl, author, task, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";
	var values = [
		meetingDetails.roomName + "-" + (snapshot.snapshotId + 1),
		snapshot.structure,
		meetingDetails.domain,
		meetingDetails.roomName,
		meetingDetails.url,
		snapshot.author,
		snapshot.task,
		new Date(snapshot.timestamp),
		getStatus(snapshot.selected)
	];


	//first check if this idea is saved already
	checkDuplicate(snapshot, meetingDetails).then(function() {
		dfd.resolve();
	}).catch(function() {

		postgresStorage.query(insertStmt, values).then(function() {

			console.log("Snapshot successfully updated in psql.idearepositorymol");
			dfd.resolve();

		}).catch(function(err) {
			dfd.reject(err);
		});

	});

	return dfd.promise;
};

module.exports = {
    name: "jchem-psql",
    domains: ["disabled"],
    insertSnapshot: function(snapshot) {
        insertSnapshot(snapshot, this);
    },
	updateSnapshot: function(snapshot) {
		updateSnapshot(snapshot, this);
	}
};