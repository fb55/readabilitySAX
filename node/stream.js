var Readability = require("../readabilitySAX"),
	Parser = require("htmlparser2/lib/Parser.js"),
	getContent = require("./index.js");

var Stream = module.exports = function(settings, cb){
	this._cb = cb;
	this._readable = new Readability(settings);
	this._parser = new Parser(this._readable);
	this._data = "";
	
	this.on("error", function(err){
		err = err.toString();
    	cb({
    		title:	"Error",
    		text:	err,
    		html:	"<b>" + err + "</b>",
    		error: true
    	});
	});
};

require("util").inherits(Stream, require("stream"));

Stream.prototype.write = function(data){
	data = data.toString();
	this._data += data;
	this._parser.write(data);
};
Stream.prototype.end = function(){
	this._parser.done();
	var article = this._readable.getArticle();
	if(article.score < 300 && article.textLength < 250){
	    article = getContent.process(this._data, this._settings, 1);	
	}
	this._cb(article);
};
Stream.prototype.writable = true;