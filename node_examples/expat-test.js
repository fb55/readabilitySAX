var readability = require("../readabilitySAX"),
	page = require("fs").readFileSync(__dirname + "/testpage.html"),
	expat = require("node-expat"),
	start = Date.now(),
	cbs = {},
	readable = new readability.process(cbs, {}),
	p = new expat.Parser("UTF-8");

p.on("startElement", function(name, attrs){
	cbs.onopentag({
		name:name,
		attributes: attrs
	});
	for(var i in attrs)
		cbs.onattribute({
			name: i, 
			value: attrs[i]
		});
});
p.on("endElement", cbs.onclosetag);
p.on("text", cbs.ontext);

p.parse(page);

var result = readable.getArticle();

console.log("expat  took:", Date.now() - start);

var getReadableContent = require("./getReadableContent").process;
page = page.toString();
start = Date.now();
getReadableContent(page);
console.log("sax.js took:", Date.now() - start);

console.log("score:", result.score);