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
	
	var settings, stream;

	var req = minreq({
		uri: typeof uri === "object" ? uri : url.parse(uri),
		only2xx: true
	}, function(err, headers, body){
		if(err) return onErr(err);
		if(!stream) return onErr("Got no stream!");
		if(calledCB) return console.log("got end with calledCB = true");
		
		var article = stream.getArticle();
		if(article.textLength < 250 && article.score < 300){
			article = processData(body, settings, 1);	
		}
		
		article.link = req.response.location;
		cb(article);
	}).on("response", function(resp){
		settings = {pageURL: req.response.location, type: format};
		stream = new WritableStream(settings);
		req.pipe(stream);
	});
};