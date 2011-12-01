var Readability = require("../ReadabilitySAX"),
	request = require("request"),
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
	else throw Error("no uri specified!");
	
	console.log(link);
	
	var readable, parser, data = "", settings,
		onResponseCB = function(err, resp){
			if(err) return onErr(err);
			
			settings = { pageURL: url.format(resp.request.uri) };
			
			readable = new Readability(settings);
			parser = new Parser(readable);
		},
		req = request({
			uri: link,
			onResponse: onResponseCB
		});
	
	req.on("error", onErr);
	
	req.on("data", function(chunk){
		chunk = chunk.toString();
		parser.write(chunk);
		data += chunk;
	});
	
	req.on("end", function(){
		parser.done();
		
		var article = readable.getArticle();
		if(article.score < 300 && article.textLength < 250){
			article = exports.process(data, settings, 1);	
	    }
	    article.link = link.href;
	    cb(article);
	});
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