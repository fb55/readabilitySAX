var WritableStream = require("./WritableStream.js"),
	minreq = require("minreq"),
	url = require("url"),
	processData = require("./process.js");

module.exports = function(uri, settings, cb){
	if(typeof settings === "function"){
		cb = settings;
		settings = {};
	} else  if(typeof settings === "string"){
		settings = {type: settings};
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
		if("content-type" in resp.headers && resp.headers["content-type"].substr(0, 5) !== "text/"){
			//TODO we're actually only interested in text/html, but text/plain shouldn't result in an error (as it will be forwarded)
			onErr("document isn't text");
			return;
		}
		settings.pageURL = req.response.location;

		var stream = new WritableStream(settings, function(article){
			if(calledCB) return console.log("got article with called cb");
			article.link = req.response.location;
			cb(article);
		});

		req.pipe(stream);
	});
};