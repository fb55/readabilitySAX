var createWritableStream = require("../").createWritableStream,
	fs = require("fs"),
	dir = "/Users/felix/Downloads/CleanEval/finalrun-input/",
	files = fs.readdirSync(dir),
	time = 0, total = files.length, skipped = 0, min = 1/0, 
	max = -1/0;

function run(name){
	if(!name || name.charAt(0) === ".") return proc();

	var file = fs.readFileSync(dir + name).toString(),
		start = Date.now();

	createWritableStream(function(ret){
		if(!ret.score) skipped++;
	    else {
			var took = Date.now() - start;
			time += took;
			if(took < min) min = took;
			if(took > max) max = took;
	    }
	}).end(file);
}


function proc(){
	if(!files.length) return;
	run( files.pop() );
	process.nextTick(proc);
	if(files.length % 10 === total % 10) console.log("did", total - files.length );
}

proc();

process.on("exit",function(){
	var did = total - skipped;
	console.log("took", time);
	console.log("runs", did);
	console.log("average", Math.round((time / did)*1e4) / 1e4);
	console.log("min", min);
	console.log("max", max);
	console.log("skipped", skipped);
});