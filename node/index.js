var Readability = require("../readabilitySAX"),
	http = require("http"),
	https = require("https"),
	url = require("url"),
	Parser = require("htmlparser2/lib/Parser.js");

exports.get = function(uri, cb){
	function onErr(err){
		err = err.toString();
		cb({
			title:	"Error",
	    	text:	err,
	    	html:	"<b>" + err + "</b>",
	    	error: true
	    });
	}
	
	var link;
	if(typeof uri === "object") link = uri;
	else if(typeof uri === "string") link = url.parse(uri);
	else onErr("No URI specified!");
	
	var req;
	if(link.protocol === "http:") req = http;
	else if(link.protocol === "https:") req = https;
	else onErr("Unsupported protocol: " + link.protocol);
	
	req.request(link, function(resp){
		if(resp.statusCode % 301 < 2){
			exports.get(resp.headers.location, cb);
			return;
		}
		if(resp.statusCode % 400 < 100){
			onErr("Got error: " + http.STATUS_CODES[resp.statusCode]);
			return;
		}
		
		var settings = {pageURL: url.format(link)},
			readable = new Readability(settings),
			parser = new Parser(readable),
			data = "";
		
		resp.on("data", function(chunk){
			chunk = chunk.toString();
			data += chunk;
			parser.write(chunk);
		});
		
		resp.on("end", function(){
			parser.done();
			
			var article = readable.getArticle();
			if(article.score < 300 && article.textLength < 250){
				article = exports.process(data, settings, 1);	
	    	}
	    	article.link = link.href;
	    	cb(article);
		});
	}).on("error", onErr).end();
};

exports.process = function(data, settings, skipLevel){
	if(!skipLevel) skipLevel = 0;
	if(!settings) settings = {};
	
	var readable = new Readability(settings),
		parser = new Parser(readable),
		article;
	
	do {
		if(skipLevel !== 0) readable.setSkipLevel(skipLevel);

	    parser.parseComplete(data);

	    article = readable.getArticle();
	    skipLevel += 1;
	} while(article.score < 300 && article.textLength < 250 && skipLevel < 4);
	
	/*
	if(article.textLength < 250) return {
			title:	"Error",
	    	text:	"Couldn't find content!",
	    	html:	"<b>Couldn't find content!</b>",
	    	error: true
	};
	*/
	return article;
};

exports.Readability = Readability;