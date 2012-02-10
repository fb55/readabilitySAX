var Readability = require("../readabilitySAX.js"),
	WritableParser = require("htmlparser2/lib/WritableStream.js"),
	parserOptions = {
		lowerCaseTags: true
	};

var WritableStream = function(settings){
	Readability.call(this, settings);
	WritableParser.call(this, this, parserOptions);
};

require("util").inherits(WritableStream, WritableParser);

Object.getOwnPropertyNames(Readability.prototype).forEach(function(name){
	WritableStream.prototype[name] = Readability.prototype[name];
});

module.exports = WritableStream;