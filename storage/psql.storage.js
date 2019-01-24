/*!
 * Postgres plugin
 * Marvin Live storage plugin example
 * @license MIT
 */

var conString = "postgres://docker:docker@localhost:5432/docker";


"use strict";

var Q = require("q");
var _ = require("lodash");
var pg = require("pg");

pg.on("error", function(er/*, client*/) {
	console.log("Postgres Error", er);
});

var client;
/*
CREATE TABLE IF NOT EXISTS idearepository (
	id  varchar(100) NOT NULL,
    mol  varchar NOT NULL,    
	originurl  varchar(300) NOT NULL,
    author  varchar(50) NOT NULL,
    task  varchar(200),
	status  text,
	domain  varchar(40) NOT NULL,
    room  varchar(200) NOT NULL,
	timestamp  timestamp
);
ALTER TABLE idearepository OWNER TO docker;
*/


//get a postgres client from the pool
function connect() {
	var dfd = Q.defer();
	
	pg.connect(conString, function(err, pgClient, done) {			
		if (err) {
			console.error("Error fetching client from pool", err);
			dfd.reject(err);
			return;
		}
		client = pgClient;
		client.doneCallback = done;
		dfd.resolve(client);
	});
	
	var pool = pg.pools.getOrCreate(conString);
	console.log("PG pool size is now", pool.getPoolSize());
	
	
	return dfd.promise;
}

//generic query method that uses a connection from the tool
function query(statement, data) {
	var dfd = Q.defer();
		
	connect().then(function(client) {
		client.query(statement, data, function(err, result) {
			//release the client back to the pool
			client.doneCallback();
			if (err) {
				console.log("An error occurred during psql query", err.stack);
				dfd.reject(err);
			} else {
				dfd.resolve(result);
			}
		});
	});

	return dfd.promise;
}


function getStatus(selectedFlag) {
	return selectedFlag ? "In review" : "In design";
}


//update the snapshot using its id
function updateSnapshot(snapshot, meetingDetails) {
	
	var updateStmt = "UPDATE idearepository SET task = $3, status = $4 WHERE id = $1 AND domain = $2;"
	
	var values = [
		meetingDetails.roomName + "-" + (snapshot.snapshotId + 1),
		meetingDetails.domain, 
		snapshot.task,
		getStatus(snapshot.selected)
	];
	
	return query(updateStmt, values).then(function() {
		console.log("Snapshot successfully updated in psql.idearepository");
	});
}


//save the snapshot and most of its details into the idea repository
function insertSnapshot(snapshot, meetingDetails) {
	
	var insertStmt = "INSERT INTO idearepository (id, mol, domain, room, originurl, author, task, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);"
	
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
	
	return query(insertStmt, values).then(function() {
		console.log("Snapshot successfully saved in psql.idearepository");
	});
};

module.exports = {
    name: "psql",
    domains: ["disabled"],
    insertSnapshot: function(snapshot) {
        insertSnapshot(snapshot, this);
    },
	updateSnapshot: function(snapshot) {
		updateSnapshot(snapshot, this);
	},
	query: query
};