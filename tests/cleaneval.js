var getReadableContent = require("../").process,
	fs = require("fs"),
	dir = "/Users/felix/Downloads/CleanEval/",
	input = dir + "finalrun-input/",
	output = dir + "finalrun-output/",
	ents = require("entities");

fs
.readdirSync(input)
.forEach(function(name){
	if(!name || name.charAt(0) === ".") return;

	var ret = getReadableContent(
		fs.readFileSync(input + name).toString(),
		{ type: "text" }
	);

	//if(ret.score < 100) return;

	fs.writeFileSync(
		output + name.replace(".html", ".txt"),
		(ret.title ? ret.title + "\n\n" : "")
		+ ents.decodeHTML5(ret.text)
	);
});

console.log("Finished all files!");

var check = require('child_process').spawn("python", [dir + "cleaneval.py", "-t", output, dir + "GoldStandard/"]);

check.stdout.pipe(process.stdout);
check.stderr.pipe(process.stderr);