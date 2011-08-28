var readability = require("../readabilitySAX"),
	request = require("request"),
	url = require("url");

var sax, htmlparser, EventedHandler;
try{ sax = require("sax"); } catch(e){}
try{
	EventedHandler = require("htmlparser2/lib/EventedHandler.js");
	htmlparser = require("htmlparser2/lib/Parser.js");
} catch(e){}


/*
* function getParser abstracts the parser
* it returns an object including readability
* and the parsers write method
*/
function getParser(settings, slowParser){
	if((slowParser && htmlparser && EventedHandler) || !sax){ //if the sax parser isn't present, don't rely on it
		var cbs = {},
			readable = readability.process(cbs, settings),
			handler = new EventedHandler(cbs),
			parser = new htmlparser(handler);
		
		return {
			write: parser.parseChunk.bind(parser),
			close: parser.done.bind(parser),
			getArticle: readable.getArticle.bind(readable)
		}
	}
	else {
		var parser = sax.parser(false, {
		    lowercasetags : true
		});
		var readable = new readability.process(parser, settings);
		
		return {
			write: parser.write.bind(parser),
			close: parser.close.bind(parser),
			getArticle: readable.getArticle.bind(readable)
		}
	}
}

exports.get = function(uri, cb, options){
	options = options || {slowParser: true};
	
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
			
			parser = getParser(settings, options.slowParser);
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
			ret = exports.process(data, settings);	
	    }
	    ret.link = link.href;
	    cb(ret);
	});
};
exports.process = function(data, options){
	skipLevel = options.skipLevel || 0;
	readabilitySettings = options.readabilitySettings || {};
	
	var contentLength = 0,
		parser, ret;
	
	while(contentLength < 250 && skipLevel < 4){
	    readabilitySettings.skipLevel = skipLevel;
	    
	    parser = getParser(readabilitySettings, options.slowParser);
	    
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