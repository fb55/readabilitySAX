#!/usr/bin/env node

function write(){
	process.stdout.write(Array.prototype.join.call(arguments, " ") + "\n");
};

if(process.argv.length < 3 || !/^https?:\/\//.test(process.argv[2])){
	write("Usage:", "readability", "http://domain.tld/sub", "[format]");
	return;
}

require("./getURL.js")(process.argv[2], process.argv[3] === "html" ? "html" : "text", function(result){
	if(result.error) return write("ERROR:", result.text);

	//else
	write("TITLE:", result.title);
	write("SCORE:", result.score);
	if(result.nextPage) write("NEXT PAGE:", result.nextPage);
	write("LENGTH:", result.textLength);
	write("");
	
	var text;
	if("text" in result){
		text = require("entities").decodeHTML5(result.text);
	} else {
		text = result.html.replace(/\s+/g, " ");
	}
	write(text);
	
	process.exit();
});