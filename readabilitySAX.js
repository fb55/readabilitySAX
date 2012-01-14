/*
* readabilitySAX
* https://github.com/fb55/readabilitySAX
*
* The code is structured into three main parts:
* 	1. A list of properties that help readability to determine how a "good" element looks like
* 	2. An light-weight "Element" class that is used instead of the DOM (and provides some DOM-like functionality)
* 	3. The Readability class that provides the interface & logic (usable as a htmlparser2 handler)
*/


//1. list of values
var tagsToSkip = {aside:true,footer:true,head:true,header:true,input:true,link:true,nav:true,noscript:true,script:true,select:true,style:true,textarea:true},
	tagCounts = {address:-3,article:30,blockquote:3,body:-5,dd:-3,div:5,dl:-3,dt:-3,form:-3,h2:-5,h3:-5,h4:-5,h5:-5,h6:-5,li:-3,ol:-3,pre:3,td:3,th:-5,ul:-3},
	embeds = {embed:true,object:true,iframe:true}, //iframe added for html5 players
	goodAttributes = {alt:true,href:true,src:true,title:true/*,style:true*/},
	cleanConditionaly = {div:true,form:true,ol:true,table:true,ul:true},
	tagsToScore = {p:true,pre:true,td:true},
	headerTags = {h1:true,h2:true,h3:true,h4:true,h5:true,h6:true},
	newLinesAfter = {br:true,li:true,p:true},
	newLinesBefore = {p:true},

	divToPElements = ["a","blockquote","dl","div","img","ol","p","pre","table","ul"],

	re_videos = /http:\/\/(?:www\.)?(?:youtube|vimeo)\.com/,
	re_nextLink = /[>»]|continue|next|weiter(?:[^\|]|$)/i,
	re_prevLink = /[<«]|earl|new|old|prev/i,
	re_extraneous = /all|archive|comment|discuss|e-?mail|login|print|reply|share|sign|single/i,
	re_pages = /pag(?:e|ing|inat)/i,
	re_pagenum = /p[ag]{0,2}(?:e|ing|ination)?[=\/]\d{1,2}/i,

	re_safe = /hentry|instapaper_body/,
	re_final = /first|last/i,

	re_positive = /article|body|content|entry|main|pag(?:e|ination)|post|text|blog|story/,
	re_negative = /com(?:bx|ment|-)|contact|foot(?:ter|note)?|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget/,
	re_unlikelyCandidates = /ad-break|agegate|com(?:bx|ment|munity)|disqus|extra|foot|header|menu|pag(?:er|ination)|popup|remark|rss|shoutbox|sidebar|sponsor|tweet|twitter|unrelated/,
	re_okMaybeItsACandidate = /and|article|body|column|main|shadow/,

	re_sentence = /\.(?: |$)/,
	re_whitespace = /\s+/g,

	re_pageInURL = /[_\-]?p[a-zA-Z]*[_\-]?\d{1,2}$/,
	re_badFirst = /^(?:[^a-z]{0,3}|index|\d+)$/i,
	re_noLetters = /[^a-zA-Z]/,
	re_params = /\?.*/,
	re_extension = /00,|\.[a-zA-Z]+$/g,
	re_digits = /\d/,
	re_justDigits = /^\d{1,2}$/,
	re_slashes = /\/+/,
	re_domain = /\/([^\/]+)/,

	re_protocol = /^\w+\:/,
	re_cleanPaths = /\/\.(?!\.)|\/[^\/]*\/\.\./,

	re_closing = /\/?(?:#.*)?$/,

	re_commas = /,[\s\,]*/g;

//2. the tree element
var Element = function(tagName, parent){
		this.name = tagName;
		this.parent = parent;
		this.attributes = {};
		this.children = [];
		this.skip = false;
		this.tagScore = 0;
		this.attributeScore = 0;
		this.totalScore = 0;
		this.elementData = "";
		this.info = {
			textLength: 0,
			linkLength: 0,
			commas:		0,
			density:	0,
			tagCount:	{}
		};
		this.isCandidate = false;
};

Element.prototype = {
	addInfo: function(){
		var info = this.info,
			childs = this.children,
			childNum = childs.length,
			elem;
		for(var i=0; i < childNum; i++){
			elem = childs[i];
			if(typeof elem === "string"){
				info.textLength += elem.length;
				info.commas += elem.split(re_commas).length - 1;
			}
			else {
				if(elem.name === "a"){
					info.linkLength += elem.info.textLength + elem.info.linkLength;
				}
				else{
					info.textLength += elem.info.textLength;
					info.linkLength += elem.info.linkLength;
				}
				info.commas += elem.info.commas;

				for(var j in elem.info.tagCount){
					if(j in info.tagCount) info.tagCount[j] += elem.info.tagCount[j];
					else info.tagCount[j] = elem.info.tagCount[j];
				}

				if(elem.name in info.tagCount) info.tagCount[elem.name] += 1;
				else info.tagCount[elem.name] = 1;
			}
		}
		info.density = info.linkLength / (info.textLength + info.linkLength);

		//if there was no text (the value is NaN), ensure it gets skipped
		if(info.density !== info.density) info.density = 1;
	},
	getOuterHTML: function(){
		var ret = "<" + this.name;

		for(var i in this.attributes)
			ret += " " + i + "=\"" + this.attributes[i] + "\"";

		if(this.children.length === 0) return ret + "/>";

		return ret + ">" + this.getInnerHTML() + "</" + this.name + ">";
	},
	getInnerHTML: function(){
		var nodes = this.children, ret = "";

		for(var i = 0, j = nodes.length; i < j; i++){
			if(typeof nodes[i] === "string") ret += nodes[i];
			else ret += nodes[i].getOuterHTML();
		}
		return ret;
	},
	getFormattedText: function(){
		var nodes = this.children, ret = "";
		for(var i = 0, j = nodes.length; i < j; i++){
			if(typeof nodes[i] === "string") ret += nodes[i].replace(re_whitespace, " ");
			else {
				if(nodes[i].name in newLinesBefore || nodes[i].name in headerTags) ret += "\n";
				ret += nodes[i].getFormattedText();
				if(nodes[i].name in newLinesAfter || nodes[i].name in headerTags) ret += "\n";
			}
		}
		return ret;
	},
	toString: function(){
		return this.children.join("");
	}
};

//3. the readability class
var Readability = function(settings){
	//the root node
	this._currentElement = new Element("document");
	this._topCandidate = null;
	this._origTitle = this._headerTitle = "";
	this._scannedLinks = {};
	if(settings) this._processSettings(settings);
};

Readability.prototype._settings = {
	stripUnlikelyCandidates: true,
	weightClasses: true,
	cleanConditionally: true,
	cleanAttributes: true,
	searchFurtherPages: true,
	linksToSkip: {},	//pages that are already parsed
	//pageURL: null,	//URL of the page which is parsed
	//type: "html",		//default type of output
	resolvePaths: false
};

Readability.prototype._convertLinks = function(path){
	if(!this._url) return path;
	if(!path) return this._url.full;

	//ignore javascript:, mailto: links
	if(re_protocol.test(path)) return path;

	var path_split = path.split("/");

	//special cases
	if(path_split[1] === ""){
		//paths starting with "//"
		if(path_split[0] === ""){
			return this._url.protocol + path;
		}
		//full domain (if not caught before)
		if(path_split[0].substr(-1) === ":"){
			return path;
		}
	}

	if(path_split[0] === ""){ //starting with "/"
		path_split.shift();
	}
	else Array.prototype.unshift.apply(path_split, this._url.path);

	path = path_split.join("/");

	if(this._settings.resolvePaths){
		while(path !== (path = path.replace(re_cleanPaths, "")) ){};
	}

	return this._url.protocol + "//" + this._url.domain + "/" + path;
};

Readability.prototype._getBaseURL = function(){
	if(this._url.path.length === 0){
		//return what we got
		return this._url.full.replace(re_params,"");
	}

	var cleaned = "",
		elementNum = this._url.path.length - 1;

	for(var i = 0; i < elementNum; i++){
		// Split off and save anything that looks like a file type and "00,"-trash.
		cleaned += "/" + this._url.path[i].replace(re_extension, "");
	}

	var first = this._url.full.replace(re_params, "").replace(/.*\//, ""),
		second = this._url.path[elementNum];

	if(!(second.length < 3 && re_noLetters.test(first)) && !re_justDigits.test(second)){
		if(re_pageInURL.test(second)){
			second = second.replace(re_pageInURL, "");
		}
		cleaned += "/" + second;
	}

	if(!re_badFirst.test(first)){
		if(re_pageInURL.test(first)){
			first = first.replace(re_pageInURL, "");
		}
		cleaned += "/" + first;
	}

	// This is our final, cleaned, base article URL.
	return this._url.protocol + "//" + this._url.domain + cleaned;
};

Readability.prototype._processSettings = function(settings){
	var Settings = this._settings;
	this._settings = {};

	for(var i in Settings){
		if(typeof settings[i] !== "undefined")
			this._settings[i] = settings[i];
		else this._settings[i] = Settings[i];
	}

	var path;
	if(settings.pageURL){
		path = settings.pageURL.split(re_slashes);
		this._url = {
			protocol: path[0],
			domain: path[1],
			path: path.slice(2, -1),
			full: settings.pageURL.replace(re_closing,"")
		};
		this._baseURL = this._getBaseURL();
	}
	if(settings.type) this._settings.type = settings.type;
};

Readability.prototype._scanLink = function(elem){
	var href = elem.attributes.href;

	if(!href) return;

	href = this._convertLinks(href.replace(re_closing, ""));

	if(href in this._settings.linksToSkip) return;

	if(href === this._baseURL || (this._url && href === this._url.full)) return;

	var match = href.match(re_domain);

	if(!match) return;

	if(this._url && match[1] !== this._url.domain) return;

	var text = elem.toString();

	if(text.length > 25 || re_extraneous.test(text)) return;
	if(!re_digits.test(href.replace(this._baseURL, ""))) return;

	var score = 0,
		linkData = text + elem.elementData;

	if(re_nextLink.test(linkData)) score += 50;
	if(re_pages.test(linkData)) score += 25;

	if(re_final.test(linkData)){
		if(!re_nextLink.test(text))
			if(!(this._scannedLinks[href] && re_nextLink.test(this._scannedLinks[href].text)))
				score -= 65;
	}

	if(re_negative.test(linkData) || re_extraneous.test(linkData)) score -= 50;
	if(re_prevLink.test(linkData)) score -= 200;

	if(re_pagenum.test(href) || re_pages.test(href)) score += 25;
	if(re_extraneous.test(href)) score -= 15;

	var current = elem,
		posMatch = true,
		negMatch = true;

	while(current = current.parent){
		if(current.elementData === "") continue;
		if(posMatch && re_pages.test(current.elementData)){
			score += 25;
			if(!negMatch) break;
			else posMatch = false;
		}
		if(negMatch && re_negative.test(current.elementData) && !re_positive.test(current.elementData)){
			score -= 25;
			if(!posMatch) break;
			else negMatch = false;
		}
	}

	var parsedNum = parseInt(text, 10);
	if(parsedNum){
		if(parsedNum === 1) score -= 10;
		else score += Math.max(0, 10 - parsedNum);
	}

	if(href in this._scannedLinks){
		this._scannedLinks[href].score += score;
		this._scannedLinks[href].text += " " + text;
	}
	else this._scannedLinks[href] = {
		score: score,
		text: text
	};
};

//parser methods
Readability.prototype.onopentag = function(tagName, attributes){
	var parent = this._currentElement,
		elem = new Element(tagName, parent);

	this._currentElement = elem;

	if(parent.skip || tagsToSkip[tagName]){
		elem.attributes = attributes;
		elem.skip = true;
		return;
	}

	var value;

	for(var name in attributes){
		value = attributes[name];
		if(!value) continue;

		if(name === "href" || name === "src"){
			//fix links
			elem.attributes[name] = this._convertLinks(value);
		}
		else if(name === "id" || name === "class"){
			value = value.toLowerCase();
			if(!this._settings.weightClasses){/* do nothing */}
			else if(re_safe.test(value)){
				elem.attributeScore = 300;
				elem.isCandidate = true;
			}
			else if(re_negative.test(value)) elem.attributeScore = -25;
			else if(re_positive.test(value)) elem.attributeScore = 25;

			elem.elementData += " " + value;
		}
		else if(this._settings.cleanAttributes){
			if(name in goodAttributes)
				elem.attributes[name] = value;
		}
		else elem.attributes[name] = value;
	}

	if(this._settings.stripUnlikelyCandidates
		&& re_unlikelyCandidates.test(elem.elementData)
		&& !re_okMaybeItsACandidate.test(elem.elementData)){
			elem.skip = true;
	}
};

Readability.prototype.ontext = function(text){
	this._currentElement.children.push(text);
};

Readability.prototype.onclosetag = function(tagName){
	var elem = this._currentElement, cnvrt;

	this._currentElement = elem.parent;

	//prepare title
	if(this._settings.searchFurtherPages && tagName === "a"){
		this._scanLink(elem);
	}
	else if(tagName === "title"){
		this._origTitle = elem.toString().trim().replace(re_whitespace, " ");
		return;
	}
	else if(tagName in headerTags){
		cnvrt = elem.toString().trim().replace(re_whitespace, " ");
		if(this._origTitle){
			if(this._origTitle.indexOf(cnvrt) !== -1){
				if(cnvrt.split(" ", 4).length === 4){
					//It's probably the title, so let's use it!
					this._headerTitle = cnvrt;
				}
				return;
			}
		}
		//if there was no title tag, use any h1 as the title
		else if(tagName === "h1"){
			this._headerTitle = cnvrt;
			return;
		}
	}

	if(elem.skip) return;

	elem.addInfo();

	//clean conditionally
	if(tagName === "p"){
		if(!("img" in elem.info.tagCount) && !("embed" in elem.info.tagCount) && !("object" in elem.info.tagCount)
			&& elem.info.linkLength === 0 && elem.info.textLength === 0)
				return;
	}
	else if(tagName in embeds){
		//check if tag is wanted (youtube or vimeo)
		if(!elem.attributes.src || !re_videos.test(elem.attributes.src)) return;
	}
	else if(tagName === "h2" || tagName === "h3"){
		//clean headers
		if (elem.attributeScore < 0 || elem.info.density > .33) return;
	}
	else if(this._settings.cleanConditionally && tagName in cleanConditionaly){
		var p = elem.info.tagCount.p || 0,
			contentLength = elem.info.textLength + elem.info.linkLength;

		if( elem.info.tagCount.img > p ) return;
		if(tagName !== "ul" && tagName !== "ol" && (elem.info.tagCount.li - 100) > p) return;
		if(elem.info.tagCount.input > p/3) return;
		if(contentLength < 25 && (!("img" in elem.info.tagCount) || elem.info.tagCount.img > 2) ) return;
		if(elem.attributeScore < 25){
			if(elem.info.density > .2) return;
		}
		else if(elem.info.density > .5) return;
		if((elem.info.tagCount.embed === 1 && contentLength < 75) || elem.info.tagCount.embed > 1) return;
	}

	elem.parent.children.push(elem);

	if(elem.isCandidate){
		//add points for the tags name
		if(tagName in tagCounts) elem.tagScore += tagCounts[tagName];

		elem.totalScore = Math.floor(
			(elem.tagScore + elem.attributeScore) * (1 - elem.info.density)
		);
		if(!this._topCandidate || elem.totalScore > this._topCandidate.totalScore){
			this._topCandidate = elem;
		}
	}

	//should node be scored?
	if(tagName in tagsToScore);
	else if(tagName === "div"){
		//check if div should be converted to a p
		for(var i = 0, j = divToPElements.length; i < j; i++){
			if(divToPElements[i] in elem.info.tagCount) return;
		}

		elem.name = "p";
	}
	else return;

	if((elem.info.textLength + elem.info.linkLength) > 24 && elem.parent && elem.parent.parent){
	    elem.parent.isCandidate = elem.parent.parent.isCandidate = true;
	    var addScore = 1 + elem.info.commas + Math.min( Math.floor( (elem.info.textLength + elem.info.linkLength) / 100 ), 3);
	    elem.parent.tagScore += addScore;
	    elem.parent.parent.tagScore += addScore / 2;
	}
};

Readability.prototype.onreset = Readability;

Readability.prototype._getCandidateSiblings = function(childs){
	//check all siblings
	var ret = [],
		candidate = this._topCandidate,
		childNum = childs.length,
		siblingScoreThreshold = Math.max(10, candidate.totalScore * .2);

	for(var i = 0; i < childNum; i++){
		if(typeof childs[i] === "string") continue;

		if(childs[i] === candidate);
		else if(candidate.attributes["class"] === childs[i].attributes["class"]){
			if((childs[i].totalScore + candidate.totalScore * .2) >= siblingScoreThreshold){
				if(childs[i].name !== "p") childs[i].name = "div";
			}
		    else continue;
		}
		else if(childs[i].name === "p")
		    if(childs[i].info.textLength >= 80 && childs[i].info.density < .25);
		    else if(childs[i].info.textLength < 80 && childs[i].info.density === 0 && re_sentence.test(childs[i].toString()));
		    else continue;
		else continue;

		ret.push(childs[i]);
	}
	return ret;
};

Readability.prototype._getCandidateNode = function(){
	var elem = this._topCandidate, parent;

	if(!elem){
		//select root node
		parent = this._currentElement;
	}
	else{

		parent = elem.parent;

		if(parent.children.length > 1){
			elem = this._getCandidateSiblings(parent.children);

			//create a new object so that the prototype methods are callable
			parent = new Element("div")
			parent.children = elem;
			parent.addInfo();
		}
	}

	while(parent.children.length === 1){
		if(typeof parent.children[0] === "object"){
			parent = parent.children[0];
		} else break;
	}

	return parent;
};

//skipLevel is a shortcut to allow more elements of the page
Readability.prototype.setSkipLevel = function(skipLevel){
	if(skipLevel === 0) return;

	//if the prototype is still used for settings, change that
	if(this._settings === Readability.prototype._settings){
		this._processSettings({});
	}

	if(skipLevel > 0) this._settings.stripUnlikelyCandidates = false;
	if(skipLevel > 1) this._settings.weightClasses = false;
	if(skipLevel > 2) this._settings.cleanConditionally = false;
};

Readability.prototype.getTitle = function(){
	var curTitle = this._headerTitle,
		origTitle = this._origTitle;

	if(curTitle) return curTitle;

	curTitle = origTitle || "";
	if(!curTitle) return;

	if(/ [\|\-] /.test(curTitle)){
		curTitle = curTitle.replace(/(.*) [\|\-] .*/g, "$1");

		if(curTitle.split(" ", 2).length < 2)
			curTitle = origTitle.replace(/.*?[\|\-] (.*)/g,"$1");
	}
	else if(curTitle.indexOf(": ") !== -1){
		curTitle = curTitle.substr(curTitle.lastIndexOf(": ") + 2);

		if(curTitle.split(" ", 2).length < 2)
			curTitle = origTitle.substr(0, origTitle.indexOf(": "));
	}

	curTitle = curTitle.trim();

	if(curTitle.split(" ", 5).length < 5)
		curTitle = origTitle;

	return curTitle;
};

Readability.prototype.getNextPage = function(){
	var topScore = 49, topLink = "";
	for(var link in this._scannedLinks){
		if(this._scannedLinks[link].score > topScore){
			topLink = link;
			topScore = this._scannedLinks[link].score;
		}
	}

	return topLink;
};

Readability.prototype.getHTML = function(node){
	return (node || this._getCandidateNode()).getInnerHTML() //=> clean it
		//normalise <br>s, remove spaces in front of them
		.replace(/(?:\s|&nbsp;?)*<br.*?>/g, "<br/>")
		//turn all double+ <br>s into <p>s
		.replace(/(?:<br\/>){2,}/g, "</p><p>")
		//remove <br>s in front of <p>s, <font>s & <span>s, empty <li>s
		.replace(/<br\/>\s*(?=<p)|<\/?(?:font|span).*?>|<li.*?>(?:\s|&nbsp;?)*<\/li>/g, "")
		//trim the result
		.trim();
};

Readability.prototype.getText = function(node){
	return (node || this._getCandidateNode()).getFormattedText().trim().replace(/\n+(?=\n{2})/g, "");
};

Readability.prototype.getArticle = function(type){
	var elem = this._getCandidateNode();

	var ret = {
		title: this.getTitle(),
		nextPage: this.getNextPage(),
		textLength: elem.info.textLength,
		score: this._topCandidate ? this._topCandidate.totalScore : 0
	};

	if(!type && this._settings.type) type = this._settings.type;

	if(type === "text") ret.text = this.getText(elem);
	else ret.html = this.getHTML(elem);

	return ret;
};

if(typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = Readability;