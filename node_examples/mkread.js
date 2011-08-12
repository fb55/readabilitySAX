var getReadableContent = require("./getReadableContent.js"),
	url = require("url"),
	link = "";

var processContent = function(data){
	var conTime = Date.now();
	
	var ret = getReadableContent.process(data, 0, {
		convertLinks: url.resolve.bind(null, link),
	    link: link
	});
	
	ret.duration = Date.now() - conTime;
	console.log(ret);
}


if(process.argv.length > 2){
	console.log("connecting to:", process.argv[2]);
	var link = url.parse(process.argv[2]);
	
	var client = require("http").createClient(80, link.host),
		req = client.request("GET", link.href, { 'host': link.host, 'accept':"text/html" }),
		data = "";
	
	req.addListener("response", function(connection){
		connection.addListener("data", function(chunk){
			data += chunk.toString("utf8");
		});
		connection.addListener("end", function(){
			processContent(data);
		});
	});
	req.end();
}
else
	require("fs").readFile(__dirname + "/testpage.html", function(a,b){processContent(b.toString("utf8"));});
