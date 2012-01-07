var Readability = require("../readabilitySAX"),
	minreq = require("minreq"),
	STATUS_CODES = require("http").STATUS_CODES,
	url = require("url"),
	Parser = require("htmlparser2/lib/Parser.js"),
	parserOptions = {
		lowerCaseTags: true
	};

exports.get = function(uri, cb){
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
	
	var settings, readable, parser;

	var req = minreq({
		uri: typeof uri === "object" ? uri : url.parse(uri),
		only2xx: true
	}, function(err, headers, body){
		if(calledCB) return console.log("got end with calledCB === true");
		
		parser.done();
		
		var article = readable.getArticle();
		if(article.score < 300 && article.textLength < 250){
			article = exports.process(body, settings, 1);	
		}
		article.link = req.response.location;
		cb(article);
	}).on("response", function(resp){
		settings = {pageURL: url.format(uri)};
		readable = new Readability(settings);
		parser = new Parser(readable, parserOptions);
	}).on("data", function(chunk){
		parser.write(chunk);
	}).on("error", function(err){
		onErr(err);
	});
};

exports.process = function(data, settings, skipLevel){
	if(!skipLevel) skipLevel = 0;
	if(!settings) settings = {};
	
	var readable = new Readability(settings),
		parser = new Parser(readable, parserOptions),
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