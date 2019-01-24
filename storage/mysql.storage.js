/*!
 * MySQL plugin
 * Marvin Live storage plugin example
 * @license MIT
 */

var conString = "mysql://docker:docker@localhost:3306/docker";


"use strict";

var Q = require("q");
var _ = require("lodash");
var mysql = require("mysql");

/*
CREATE TABLE IF NOT EXISTS idearepository (
	id  varchar(100) NOT NULL,
    mol  BLOB NOT NULL,    
	originurl  varchar(300) NOT NULL,
    author  varchar(50) NOT NULL,
    task  varchar(200),
	status  text,
	domain  varchar(40) NOT NULL,
    room  varchar(200) NOT NULL,
	timestamp  timestamp
);
GRANT ALL PRIVILEGES on `docker` TO 'docker'@'%';
*/


var pool = mysql.createPool(conString);


//get a mysql connection from the pool
function connect() {
	var dfd = Q.defer();
	
	pool.getConnection(function(err, connection) {
		if (err) {
			console.error("Error fetching connection from pool", err);
			dfd.reject(err);
			return;
		}
		dfd.resolve(connection);
	});
	
	return dfd.promise;
}

//generic query method that uses a connection from the tool
function query(statement, data) {
	var dfd = Q.defer();
	connect().then(function(connection) {
		connection.query(statement, data, function(err, result) {
			//release the connection back to the pool
			connection.release();
			if (err) {
				console.log("An error occurred during mysql query", err.stack);
				dfd.reject(err);
			} else {
				dfd.resolve(result);
			}
		});
	}).catch(dfd.reject);

	return dfd.promise;
}


function getStatus(selectedFlag) {
	return selectedFlag ? "In review" : "In design";
}


//update the snapshot using its id
function updateSnapshot(snapshot, meetingDetails) {

	var updateStmt = "UPDATE idearepository SET task = ?, status = ? WHERE id = ? AND domain = ?;"
	
	var values = [
		snapshot.task,
		getStatus(snapshot.selected),
		meetingDetails.roomName + "-" + (snapshot.snapshotId + 1),
		meetingDetails.domain
	];
	
	return query(updateStmt, values).then(function() {
		console.log("Snapshot successfully updated in mysql.idearepository");
	});
}


//save the snapshot and most of its details into the idea repository
function insertSnapshot(snapshot, meetingDetails) {
	
	var insertStmt = "INSERT INTO idearepository (id, mol, domain, room, originurl, author, task, timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);"
	
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
		console.log("Snapshot successfully saved in mysql.idearepository");
	});
};

module.exports = {
    name: "mysql",
    domains: ["disabled"],
    insertSnapshot: function(snapshot) {
        insertSnapshot(snapshot, this);
    },
	updateSnapshot: function(snapshot) {
		updateSnapshot(snapshot, this);
	}
};