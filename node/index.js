var Readability = require("../ReadabilitySAX"),
	request = require("request"),
	url = require("url"),
	Parser = require("htmlparser2/lib/Parser.js");

exports.get = function(uri, cb){
	function onErr(err){
		cb({
			title:	"Error",
	    	text:	err.toString(),
	    	html:	"<b>" + err.toString() + "</b>",
	    	error: true
	    });
	}
	
	if(!uri || uri.trim() === ""){
	    return onErr("No URI specified!");
	}
	
	var link = url.parse(uri),
		readable, parser, data = "", settings,
		onResponseCB = function(err, resp){
			if(err) return onErr(err);
			
			link = resp.request.uri;
			
			settings = {
				convertLinks: url.resolve.bind(null, link),
				link: link
			};
			
			readable = Readability.process(settings);
			parser = new Parser(readable);
		},
		req = request({
			uri: link,
			onResponse: onResponseCB
		});
	
	req.on("error", onErr);
	
	req.on("data", function(chunk){ chunk = chunk.toString("utf8"); parser.write(chunk); data += chunk; })
	
	req.on("end", function(){
		parser.done();
		
		var ret = readable.getArticle();
		if(ret.textLength < 250){
			ret = exports.process(data, settings, 1);	
	    }
	    ret.link = link.href;
	    cb(ret);
	});
};
exports.process = function(data, settings, skipLevel){
	if(!skipLevel) skipLevel = 0;
	else if(skipLevel > 3) skipLevel = 0;
	if(!settings) settings = {};
	
	var contentLength = 0,
		parser, ret;
	
	var readable = new Readability(settings),
		parser = new Parser(readable);
	
	while(contentLength < 250 && skipLevel < 4){
		readable.setSkipLevel(skipLevel);
	    parser.parseComplete(data);
	    
	    ret = readable.getArticle();
	    contentLength = ret.textLength;
	    skipLevel += 1;
	}
	/*
	if(contentLength < 250) return {
			title:	"Error",
	    	text:	"Couldn't find content!",
	    	html:	"<b>Couldn't find content!</b>",
	    	error: true
	};
	*/
	return ret;
};

exports.Readability = Readability;