var sax =  require('../libs/sax'),
	readability = require("../readabilitysax"),
	url = require("url");

exports.get = function(uri, cb){
	if(!uri || uri.trim() === ""){cb({
			title:	"Error",
	    	text:	"No URI specified!",
	    	html:	"<b>No URI specified!</b>",
	    	error: true
	    });
	    return;
	}
	
	var link = url.parse(uri),
		client = require("http").createClient(80, link.host),
		req = client.request("GET", link.href, { host: link.host, accept:"text/html" });
	
	client.addListener("error", function(err) {
		cb({
			title:	"Error",
	    	text:	"Couldn't find uri!",
	    	html:	"<b>Couldn't find uri!</b>",
	    	error: true
	    });
	});
	
	req.addListener("response", function(connection){
		if(connection.statusCode === 301 || connection.statusCode === 302)
			return exports.get(connection.headers.location, cb);
		var parser = sax.parser(false, {	
			trim : true,
		    lowercasetags : true
		});
		var data = "";
		
		var readable = new readability.process(parser, {
			convertLinks: function(a){
				return url.resolve(link, a);
			},
			pageURL: url.format(link)
		});
		
		connection.addListener("data", function(chunk){
			parser.write(chunk.toString("utf8"));
			data += chunk.toString("utf8");
		});
		connection.addListener("end", function(){
			parser.close();
			var ret = readable.getArticle();
			if(ret.textLength < 250){
				ret = exports.process(data, 1, {
					convertLinks: function(a){
						return url.resolve(link, a);
					},
					pageURL: url.format(link)
				});	
			}
			ret.link = link.href;
			cb(ret);
		});
	});
	req.end();
};
exports.process = function(data, skipLevel, readabilitySettings, type){
	skipLevel = skipLevel || 0;
	readabilitySettings = readabilitySettings || {};
	
	var contentLength = 0,
		parser, readable, ret;
	
	while(contentLength < 250 && skipLevel < 4){
	    parser = sax.parser(false, {	
			trim : true,
		    lowercasetags : true
		});
	    
	    readabilitySettings.skipLevel = skipLevel;
	    
	    readable = new readability.process(parser, readabilitySettings);
	    
	    parser.write(data).close();
	    
	    ret = readable.getArticle(type);
	    contentLength = ret.textLength;
	    skipLevel += 1;
	}
	if(contentLength < 250) return {
			title:	"Error",
	    	text:	"Couldn't find content!",
	    	html:	"<b>Couldn't find content!</b>",
	    	error: true
	};
	else return ret;
};