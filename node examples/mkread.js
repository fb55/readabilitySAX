console.log("connecting to:", process.argv[2]);

var sax =  require('../libs/sax'),
	readability = require("../readabilitysax"),
	url = require("url"),
	link = "";

var parserSettings = {
	trim : true,
    normalize: true,
    lowercasetags : true
};
var convertLinks = function(a){
	return url.resolve(link, a);
};

var processContent = function(data){
	var conTime = Date.now(),
		skipLevel = 0,
		contentLength = 0,
		parser, readable, ret;
	
	while(contentLength < 250 && skipLevel < 4){
	    parser = sax.parser(false, parserSettings);
	    
	    readable = new readability.process(parser, {
	    	convertLinks: convertLinks,
	    	pageURL: url.format(link),
	    	skipLevel: skipLevel
	    });
	    
	    parser.write(data).close();
	    
	    ret = readable.getArticle();
	    contentLength = ret.textLength;
	    skipLevel += 1;
	}
	
	ret.skipLevel = skipLevel - 1;
	ret.duration = Date.now() - conTime;
	console.log(ret);
}

//processContent(require("fs").readFileSync(__dirname + "/testfile.html") + "");

link = url.parse(process.argv[2]);

var client = require("http").createClient(80, link.host),
	req = client.request("GET", link.href, { 'host': link.host, 'accept':"text/html" }),
	data = "";

req.addListener("response", function(connection){
	connection.addListener("data", function(chunk){
		//parser.write(chunk.toString("utf8"));
		data += chunk.toString("utf8");
	});
	connection.addListener("end", function(){
		processContent(data);
	});
});
req.end();