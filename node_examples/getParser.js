/*
* module getParser abstracts the parser
*/

var parsers = {
	"htmlparser2":true,
	"node-expat": true,
	"sax": true
};

//just check them
Object.keys(parsers).forEach(function(name){
	try{
		parsers[name] = require(name);
	}
	catch(e){
		parsers[name] = false;
	}
});

//node-expat
exports["get-node-expat"] = function(cbs){
	var parser = parsers["node-expat"].Parser;
	var p = new parser("UTF-8");
	
	function open(name, attrs){
		cbs.onopentag({
			name:name,
			attributes: attrs
		});
	};
	function attrs(name, attrs){ 
		for(var i in attrs)
			cbs.onattribute({
				name: i, 
				value: attrs[i]
		});
	};
	if(cbs.onopentag){
		if(cbs.onattribute)
			p.on("startElement",function(a,b){ open(a,b); attrs(a,b) });
		else p.on("startElement",open);
	} else if(cbs.onattribute)
		p.on("startElement",attrs);
	
	if(cbs.onclosetag)
		p.on("endElement", cbs.onclosetag);
	
	if(cbs.ontext);
		p.on("text", cbs.ontext);
	
	return {
		write: p.parse.bind(p),
		close: function(){}
	};
}

//sax
exports["get-sax"] = function(cbs){
	var parser = require("sax").parser(false, {
	    lowercasetags : true
	});
	
	for(var i in cbs)
		if(cbs.hasOwnProperty(i))
			parser[i] = cbs[i];
	
	return parser;
}

//htmlparser2
exports["get-htmlparser2"] = function(cbs){
	var EventedHandler = require("htmlparser2/lib/EventedHandler.js"),
		htmlparser = require("htmlparser2/lib/Parser.js"),
		handler = new EventedHandler(cbs),
		parser = new htmlparser(handler);
	
	return {
		write: parser.parseChunk.bind(parser),
		close: parser.done.bind(parser)
	};
}

exports.getParser = function(prefer){
	if(prefer && parsers[prefer]) return exports["get-" + prefer];
	
	for(var i in parsers)
		if(parsers.hasOwnProperty(i) && parsers[i])
			return exports["get-" + i];
}