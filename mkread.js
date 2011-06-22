console.log("connecting to:", process.argv[2]);

var sax =  require('./libs/sax'),
	readability = require("./readabilitysax"),
	url = require("url");

var parser = sax.parser(false, {
	trim : true,
    normalize: true,
    lowercasetags : true
});

var link = url.parse(process.argv[2]),
	client = require("http").createClient(80, link.host),
	req = client.request("GET", link.href, { 'host': link.host, 'accept':"text/html" }),
	data = "";

var readable = new readability.process(parser, {
	convertLinks: function(a){
		return url.resolve(link, a);
	},
	pageURL: url.format(link)
});

req.addListener("response", function(connection){
	connection.addListener("data", function(chunk){
		//parser.write(chunk.toString("utf8"));
		data += chunk.toString("utf8");
	});
	connection.addListener("end", function(){
		var conTime = Date.now();
		parser.write(data);
		parser.close();
		var ret = readable.getArticle();
		ret.duration = Date.now() - conTime;
		console.log(ret);
	});
});
req.end();
//parser.write(require("fs").readFileSync(__dirname + "/testfile.html") + "").close();