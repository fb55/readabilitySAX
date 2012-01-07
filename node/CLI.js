#!/usr/bin/env node

if(process.argv.length < 3 || !/^https?:\/\//.test(process.argv[2])){
	console.log("Usage:", "readability", "http://domain.tld/sub");
	return;
}

require("minreq")(process.argv[2])
.on("error", console.log.bind(null, "Request error:"))
.pipe(new (require("./stream.js"))({
	type: process.argv[3] || "text" //default output is text
}))
.on("error", console.log.bind(null, "Parsing error:"))
.on("data", function(result){
	console.log("TITLE:", result.title);
	console.log("SCORE:", result.score);
	if(result.nextPage) console.log("NEXT PAGE:", result.nextPage);
	console.log("LENGTH:", result.textLength);
	console.log("");
	console.log(result.text || result.html);
	
	process.exit();
});