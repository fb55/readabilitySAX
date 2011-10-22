var readability = require("../readabilitySAX"),
	request = require("request"),
	url = require("url"),
	htmlparser2 = require("htmlparser2");

function getReadability(rdOpts){
	var cbs = {},
		readable = readability.process(cbs, rdOpts),
		handler = new htmlparser2.EventedHandler(cbs),
		parser = new htmlparser2.Parser(handler);
	
	return {
		write: parser.parseChunk.bind(parser),
		close: parser.done.bind(parser),
		getArticle: readable.getArticle.bind(readable)
	};
}

exports.get = function(uri, cb, options){
	options = options || {};
	
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
		parser, data = "", settings,
		onResponseCB = function(err, resp){
			if(err) return onErr(err);
			
			link = resp.request.uri;
			
			settings = {
				convertLinks: url.resolve.bind(null, link),
				link: link
			};
			
			parser = getReadability(settings);
		},
		req = request({
			uri: link,
			onResponse: onResponseCB
		});
	
	req.on("error", onErr);
	
	req.on("data", function(chunk){ chunk = chunk.toString("utf8"); parser.write(chunk); data += chunk; })
	
	req.on("end", function(){
		parser.close();
		
		var ret = parser.getArticle();
		if(ret.textLength < 250){
			ret = exports.process(data, {
				skipLevel: 1,
				readabilitySettings: settings,
				parser: options.parser
			});	
	    }
	    ret.link = link.href;
	    cb(ret);
	});
};
exports.process = function(data, options){
	skipLevel = options.skipLevel || 0;
	readabilitySettings = options.readabilitySettings || {};
	
	if(skipLevel > 3) skipLevel = 0;
	
	var contentLength = 0,
		parser, ret;
	
	while(contentLength < 250 && skipLevel < 4){
	    readabilitySettings.skipLevel = skipLevel;
	    
	    parser = getReadability(readabilitySettings);
	    
	    parser.write(data);
	    parser.close();
	    
	    ret = parser.getArticle(options.type);
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