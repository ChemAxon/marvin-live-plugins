"use strict";

const request = require("request").defaults({
	"headers": {
		"User-Agent": "Mozilla/5.0"
	}
});
const Q = require("q");
const cookie = require("cookie");


const baseUrl = "";
const username = "";
const password = "";


let CST;

function getCST() {
	return CST;
}


function login() {
	
	const jar = request.jar();

	return new Promise((resolve, reject) => {
		request.post({
			jar: jar,
			url: baseUrl + "/login",
			form: {
				j_username: username,
				j_password: password
			},
			timeout: 5000
		}, (err, res, body) => {

			if (err || !res || res.statusCode < 200 || res.statusCode >= 300) {
				console.log("Couldn't log into Compound Registration", err);
				return reject();
			}

			res.headers["set-cookie"].forEach((cookieItem) => {
				const cookieObject = cookie.parse(cookieItem);
				if (cookieObject.CompregSecurityToken) {
					CST = cookieObject.CompregSecurityToken;
				}
			});

			return resolve(request.defaults({
				jar: jar,
				headers: {
					CompregSecurityToken: CST
				}
			}));
		});
	});
}


module.exports = {
	login: login,
	getCST: getCST,
	baseUrl: baseUrl
};