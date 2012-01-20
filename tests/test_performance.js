var getReadableContent = require("../"),
	Parser = require("htmlparser2/lib/Parser.js"),
	Readability = require("../readabilitySAX.js"),
	request = require("request"),
	url = require("url"),
	ben = require("ben");

var processContent = function(data, settings){
	var readable = new Readability(settings),
		parser = new Parser(readable);
	
	console.log("parsing took (ms):", ben(1e3, function(){ parser.parseComplete(data); }));
	console.log("getHTML took (ms):", ben(1e3, function(){ readable.getHTML(); }));
	console.log("getText took (ms):", ben(1e3, function(){ readable.getText(); }));
	console.log("getArticle took (ms):", ben(1e3,function(){ readable.getArticle(); }));
	console.log("Whole parsing took (ms):", ben(500, function(){ getReadableContent.process(data, settings); }));
};

if(process.argv.length > 2){
	console.log("connecting to:", process.argv[2]);
	
	request(process.argv[2], function(err, resp, body){
		processContent(body, {
			pageURL: url.format(resp.request.uri),
			log: false
		});
	});
}
else require("fs").readFile(__dirname + "/testpage.html", function(a,b){
	processContent(b.toString("utf8"), {pageURL: "http://howtonode.org/heat-tracer", log:false});
});
