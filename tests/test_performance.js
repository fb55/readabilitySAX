var getReadableContent = require("../"),
	Parser = require("htmlparser2/lib/Parser.js"),
	Readability = require("../readabilitySAX.js"),
	request = require("request"),
	url = require("url"),
	ben = require("ben"),
	link;

var getSettings = function(link){
	return link ? {
		convertLinks: url.resolve.bind(null, link),
		link: link
	} : {};
};

var processContent = function(data){
	var settings = getSettings(link),
		readable = new Readability(settings),
		parser = new Parser(readable);
	
	console.log("parsing took (ms):", ben(1e3, function(){ parser.parseComplete(data); }));
	console.log("getArticle took (ms):", ben(1e3,function(){ readable.getArticle(); }));
	console.log("Whole parsing took (ms):", ben(500, function(){ getReadableContent.process(data, settings); }));
};

function debug(data){
	var readable = new Readability(getSettings(link)),
		parser = new Parser(readable);
	
	parser.parseComplete(data);
	
	var data = readable.getArticle("text");
	
	data.text = data.text.substr(0, 200).replace(/[\\\']/g, "");
	
	console.log(data);
	console.log("Found links:", Object.keys(readable._scannedLinks).length);
};

if(process.argv.length > 2){
	console.log("connecting to:", process.argv[2]);
	
	request(process.argv[2], function(err, resp, body){
		link = resp.request.uri;
		processContent(body);
	});
}
else
	require("fs").readFile(__dirname + "/testpage.html", function(a,b){processContent(b.toString("utf8"));});
