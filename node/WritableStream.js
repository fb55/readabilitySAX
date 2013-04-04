module.exports = WritableStream;

var Readability = require("../readabilitySAX.js"),
    htmlparser2 = require("htmlparser2"),
	Parser = htmlparser2.Parser,
	CollectingHandler = htmlparser2.CollectingHandler,
	Super = require("stream").Writable || require("readable-stream").Writable,
	parserOptions = {
		lowerCaseTags: true
	};

function WritableStream(settings, callback){
	if(typeof settings === "function"){
		callback = settings;
		settings = null;
	}
	this._cb = callback;

	this._readability = new Readability(settings);
	this._handler = new CollectingHandler(this._readability);
	this._parser = new Parser(this._handler, parserOptions);

	Super.call(this);
}

require("util").inherits(WritableStream, Super);

WritableStream.prototype._write = function(chunk, encoding, cb){
	this._parser.write(chunk);
	cb();
};

WritableStream.prototype.end = function(chunk){
	this._parser.end(chunk);
	Super.prototype.end.call(this);

	for(
		var skipLevel = 1;
		this._readability._getCandidateNode().info.textLength < 250 && skipLevel < 4;
		skipLevel++
	){
		this._readability.setSkipLevel(skipLevel);
		this._handler.restart();
	}

	if(this._cb){
		this._cb(this._readability.getArticle());
	}
};