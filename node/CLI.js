#!/usr/bin/env node

if(process.argv.length < 3 || !/^https?:\/\//.test(process.argv[2])){
	console.log("Usage:", "readability", "http://domain.tld/sub");
	return;
}

require("./getURL.js")(process.argv[2], process.argv[3] === "html" ? "html" : "text", function(result){
	if(result.error) return console.log("Error:", result.text);

	//else
	console.log("TITLE:", result.title);
	console.log("SCORE:", result.score);
	if(result.nextPage) console.log("NEXT PAGE:", result.nextPage);
	console.log("LENGTH:", result.textLength);
	console.log("");
	
	var text;
	if("text" in result){
		text = require("entities").decodeHTML5(result.text);
	} else {
		text = result.html.replace(/\s+/g, " ");
	}
	console.log(text);
	
	process.exit();
});