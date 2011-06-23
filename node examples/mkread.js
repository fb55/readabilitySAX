console.log("connecting to:", process.argv[2]);

var sax =  require('../libs/sax'),
	readability = require("../readabilitysax"),
	url = require("url");



var link = url.parse(process.argv[2]),
	client = require("http").createClient(80, link.host),
	req = client.request("GET", link.href, { 'host': link.host, 'accept':"text/html" }),
	data = "";

var parserSettings = {
	trim : true,
    normalize: true,
    lowercasetags : true
};
var convertLinks = function(a){
	return url.resolve(link, a);
};

req.addListener("response", function(connection){
	connection.addListener("data", function(chunk){
		//parser.write(chunk.toString("utf8"));
		data += chunk.toString("utf8");
	});
	connection.addListener("end", function(){
		var conTime = Date.now();
		var skipLevel = 0;
		var contentLength = 0;
		var parser, readable, ret;
		
		while(contentLength < 250 && skipLevel < 4){
			parser = sax.parser(false, parserSettings);
			
			readable = new readability.process(parser, {
				convertLinks: convertLinks,
				pageURL: url.format(link)
			});
	    	
	    	parser.write(data).close();
	    	
	    	ret = readable.getArticle();
	    	contentLength = ret.textLength;
	    	skipLevel += 1;
	    }
		
		ret.skipLevel = skipLevel - 1;
		ret.duration = Date.now() - conTime;
		console.log(ret);
	});
});
req.end();
//parser.write(require("fs").readFileSync(__dirname + "/testfile.html") + "").close();