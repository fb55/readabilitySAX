var WritableStream = require("./WritableStream.js"),
	minreq = require("minreq"),
	url = require("url"),
	processData = require("./process.js");

module.exports = function(uri, settings, cb){
	if(typeof settings === "function"){
		cb = settings;
		settings = {};
	} else  if(typeof settings === "string"){
		settings = {format: settings};
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
		uri: uri,
		only2xx: true,
		headers: {
			"user-agent": "Mozilla/5.0 (compatible; readabilitySAX/1.5; +https://github.com/fb55/readabilitySAX)"
		}
	}).on("error", onErr).on("response", function(resp){
		settings.pageURL = req.response.location;

		var stream = new WritableStream(settings, function(article){
			if(calledCB) return console.log("got article with called cb");
			article.link = req.response.location;
			cb(article);
		});

		req.pipe(stream);
	});
};