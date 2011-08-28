var getReadableContent = require("./getReadableContent.js"),
	request = require("request"),
	url = require("url");

var processContent = function(data){
	var conTime = Date.now();
	
	var settings = link ? {
			convertLinks: url.resolve.bind(null, link),
		 	link: link
		 } : {};
	
	var ret = getReadableContent.process(data, {
		skipLevel: 0,
		readabilitySettings: settings,
		 slowParser: true
	});
	
	ret.duration = Date.now() - conTime;
	console.log(ret);
}

if(process.argv.length > 2){
	console.log("connecting to:", process.argv[2]);
	
	var link = url.parse(process.argv[2]);
	
	request({uri:link}, function(err, resp){
		link = resp.request.uri;
		console.log(link);
		processContent(resp.body);
	});
}
else
	require("fs").readFile(__dirname + "/testpage.html", function(a,b){processContent(b.toString("utf8"));});
