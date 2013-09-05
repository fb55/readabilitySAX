var Readability = require("../readabilitySAX.js"),
	Parser = require("htmlparser2/lib/Parser.js"),
	parserOptions = {
		lowerCaseTags: true
	};

module.exports = function(data, settings, skipLevel){
	if(!skipLevel) skipLevel = 0;
	
	var readable = new Readability(settings),
		parser = new Parser(readable, parserOptions),
		article;
	
	do {
		if(skipLevel !== 0) readable.setSkipLevel(skipLevel);

		parser.parseComplete(data);

		article = readable.getArticle();
		skipLevel += 1;
	} while(article.textLength < 250 && skipLevel < 4);
	
	/*
	if(article.textLength < 250) return {
			title:	"Error",
			text:	"Couldn't find content!",
			html:	"<b>Couldn't find content!</b>",
			error: true
	};
	*/
	return article;
};