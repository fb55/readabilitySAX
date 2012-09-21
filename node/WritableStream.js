var Readability = require("../readabilitySAX.js"),
	WritableParser = require("htmlparser2/lib/WritableStream.js"),
	parserOptions = {
		lowerCaseTags: true
	};

var WritableStream = function(settings, callback){
	if(typeof settings === "function"){
		callback = settings;
		settings = null;
	}
	Readability.call(this, settings);
	WritableParser.call(this, this, parserOptions);
	this._ws_queue = [];
	this._ws_callback = callback;
};

require("util").inherits(WritableStream, WritableParser);

Object.getOwnPropertyNames(Readability.prototype).forEach(function(name){
	//cache (almost) all events
	if(name.substr(0, 2) === "on" && name !== "onreset") {
		WritableStream.prototype[name] = function(){
			this._ws_queue.push(name, arguments);
			Readability.prototype[name].apply(this, arguments);
		};
	} else {
		WritableStream.prototype[name] = Readability.prototype[name];
	}
});

WritableStream.prototype.onend = function(){
	for(
		var candidate, skipLevel = 1;
			(candidate = this._getCandidateNode()).info.textLength < 250 &&
			skipLevel < 4;
		skipLevel++
	){
		this.onreset();
		this.setSkipLevel(skipLevel);

		for(var i = 0; i < this._ws_queue.length; i+=2){
			Readability.prototype[this._ws_queue[i]].apply(this, this._ws_queue[i+1]);
		}
	}

	if(this._ws_callback){
		this._ws_callback(this.getArticle());
	}
};

module.exports = WritableStream;