#!/usr/bin/env node

if(process.argv.length < 3 || !/^https?:\/\//.test(process.argv[2])){
	console.log("Usage:", "readability", "http://domain.tld/sub");
	return;
}

require("./getURL.js")(process.argv[2], "text", function(result){
	if(result.error) return console.log("Error:", result.text);

	//else
	console.log("TITLE:", result.title);
	console.log("SCORE:", result.score);
	if(result.nextPage) console.log("NEXT PAGE:", result.nextPage);
	console.log("LENGTH:", result.textLength);
	console.log("");
	console.log(result.text || result.html);
	
	process.exit();
});