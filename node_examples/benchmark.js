var getReadableContent = require("./getReadableContent"),
	fs = require("fs"),
	files = fs.readdirSync("/Users/felix/Downloads/output/"),
	time = 0, total = files.length, skipped = 0, min = 1/0, 
	max = -1/0;

var run = function(name){
	if(!name || name.charAt(0) === ".") return proc();

	var file = fs.readFileSync("/Users/felix/Downloads/output/" + name).toString(),
		start = Date.now();
    
    var ret = getReadableContent.process(file, 0, {});
    
    if(!ret.score) skipped++;
    else{
    	var took = Date.now() - start;
    	time += took;
    	if(took < min) min = took;
    	if(took > max) max = took;
    }
}


var proc = function(){
	if(!files.length) return;
	run( files.pop() );
	process.nextTick(proc);
	if(files.length % 10 === total % 10) console.log("did", total - files.length );
};

proc();

process.on("exit",function(){
	var did = total - skipped;
	console.log("took", time);
	console.log("runs", did);
	console.log("average", Math.round((time / did)*1e4) / 1e4);
	console.log("min", min);
	console.log("max", max);
});