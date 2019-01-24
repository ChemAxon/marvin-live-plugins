"use strict";

const request = require("request").defaults({
	"headers": {
		"User-Agent": "Mozilla/5.0"
	}
});
const cookie = require("cookie");

//"https://ps-reg-demo.chemaxon.com/RegistryCxn";
const baseUrl = process.env["CREG_SERVER"];
const username = process.env["CREG_USERNAME"];
const password = process.env["CREG_PASSWORD"];


let CST;

function getCST() {
	return CST;
}


function login() {

	console.log("CREG logging in");

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
		}, (err, res) => {

			if (err || !res || !(/^2/.test("" + res.statusCode))) {
				console.log("Couldn't log into CREG", err);
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