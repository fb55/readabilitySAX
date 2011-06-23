console.log("connecting to:", process.argv[2]);

var getReadableContent = require("./getReadableContent.js"),
	url = require("url"),
	link = "";

if(process.argv[2]){
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
	processContent(require("fs").readFileSync(__dirname + "/testfile.html") + "");

var processContent = function(data){
	var conTime = Date.now();
	
	var ret = getReadableContent.process(data, 0, {
		convertLinks: function(a){
	    	return url.resolve(link, a);
	    },
	    pageURL: url.format(link)
	});
	
	ret.duration = Date.now() - conTime;
	console.log(ret);
}

