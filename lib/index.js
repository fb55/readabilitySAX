module.exports = {
	Readability: require("../readabilitySAX.js"),
	get: require("./getURL.js"),
	process: require("./process.js"),
	WritableStream: require("./WritableStream.js"),
	createWritableStream: function(settings, cb){
		return new module.exports.WritableStream(settings, cb);
	}
};