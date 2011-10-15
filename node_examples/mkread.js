var getReadableContent = require("./getReadableContent.js"),
	request = require("request"),
	url = require("url"),
	ben = require("ben");

var processContent = function(data){
	var settings = link ? {
			convertLinks: url.resolve.bind(null, link),
		 	link: link
		 } : {};
	
	ben.async(function(done){
		var ret = getReadableContent.process(data, {
			skipLevel: 0,
			readabilitySettings: settings
		});
		done();
		
	}, console.log.bind(console, "Took (ms):"));
}

if(process.argv.length > 2){
	console.log("connecting to:", process.argv[2]);
	
	var link = url.parse(process.argv[2]);
	
	request({uri:link}, function(err, resp){
		link = resp.request.uri;
		processContent(resp.body);
	});
}
else
	require("fs").readFile(__dirname + "/testpage.html", function(a,b){processContent(b.toString("utf8"));});
