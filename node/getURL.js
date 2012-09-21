var WritableStream = require("./WritableStream.js"),
	minreq = require("minreq"),
	url = require("url"),
	processData = require("./process.js");

module.exports = function(uri, format, cb){
	if(typeof format === "function"){
		cb = format;
		format = "html";
	}

	var calledCB = false;
	function onErr(err){
		if(calledCB) return;
		calledCB = true;
		
		err = err.toString();
		cb({
			title:	"Error",
			text:	err,
			html:	"<b>" + err + "</b>",
			error: true
		});
	}

	var req = minreq({
		uri: typeof uri === "object" ? uri : url.parse(uri),
		only2xx: true
	}).on("error", onErr).on("response", function(resp){
		var stream = new WritableStream({
			pageURL: req.response.location,
			type: format
		}, function(article){
			if(calledCB) return console.log("got article with called cb");
			article.link = req.response.location;
			cb(article);
		});

		req.pipe(stream);
	});
};