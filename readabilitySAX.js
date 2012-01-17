/*
* readabilitySAX
* https://github.com/fb55/readabilitySAX
*
* The code is structured into three main parts:
* 	1. An light-weight "Element" class that is used instead of the DOM (and provides some DOM-like functionality)
* 	2. A list of properties that help readability to determine how a "good" element looks like
* 	3. The Readability class that provides the interface & logic (usable as a htmlparser2 handler)
*/

//1. the tree element
var Element = function(tagName, parent){
		this.name = tagName;
		this.parent = parent;
		this.attributes = {};
		this.children = [];
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
				info.textLength += elem.trim()./*replace(re_whitespace, " ").*/length;
				if(re_commas.test(elem)) info.commas += elem.split(re_commas).length - 1;
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

		//if there was no text (the value is NaN), ignore it
		if(info.density !== info.density) info.density = 0;
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
				if(nodes[i].name === "p" || nodes[i].name in headerTags) ret += "\n";
				ret += nodes[i].getFormattedText();
				if(nodes[i].name in newLinesAfter || nodes[i].name in headerTags) ret += "\n";
			}
		}
		return ret;
	},
	toString: function(){
		return this.children.join("");
	},
	getTopCandidate: function(){
		var childs = this.children,
			topScore = -1/0,
			topCandidate, elem;

		for(var i = 0, j = childs.length; i < j; i++){
			if(typeof childs[i] === "string") continue;
			if(childs[i].isCandidate){
				elem = childs[i];
				//add points for the tags name
				if(elem.name in tagCounts) elem.tagScore += tagCounts[elem.name];

				elem.totalScore = Math.floor(
					(elem.tagScore + elem.attributeScore) * (1 - elem.info.density)
				);
				if(topScore < elem.totalScore){
					topScore = elem.totalScore;
					topCandidate = elem;
				}
			}
			if((elem = childs[i].getTopCandidate()) && topScore < elem.totalScore){
				topScore = elem.totalScore;
				topCandidate = elem;
			}
		}
		return topCandidate;
	}
};

//2. list of values
var tagsToSkip = {aside:true,footer:true,head:true,nav:true,noscript:true,script:true,select:true,style:true,textarea:true},
	tagCounts = {address:-3,article:30,blockquote:3,body:-5,dd:-3,div:5,dl:-3,dt:-3,form:-3,h2:-5,h3:-5,h4:-5,h5:-5,h6:-5,li:-3,ol:-3,pre:3,td:3,th:-5,ul:-3},
	removeIfEmpty = {blockquote:true,li:true,p:true,pre:true,tbody:true,td:true,th:true,thead:true,tr:true},
	embeds = {embed:true,object:true,iframe:true}, //iframe added for html5 players
	goodAttributes = {alt:true,href:true,src:true,title:true/*,style:true*/},
	cleanConditionally = {div:true,form:true,ol:true,table:true,ul:true},
	unpackDivs = {embed:true,iframe:true,img:true,object:true,div:true},
	noContent = {br:new Element("br"),font:false,hr:new Element("hr"),input:false,link:false,meta:false,span:false},
	tagsToScore = {p:true,pre:true,td:true},
	headerTags = {h1:true,h2:true,h3:true,h4:true,h5:true,h6:true},
	newLinesAfter = {br:true,li:true,p:true},

	divToPElements = ["a","blockquote","dl","img","ol","p","pre","table","ul"],

	re_videos = /http:\/\/(?:www\.)?(?:youtube|vimeo)\.com/,
	re_nextLink = /[>»]|continue|next|weiter(?:[^\|]|$)/i,
	re_prevLink = /[<«]|earl|new|old|prev/i,
	re_extraneous = /all|archive|comment|discuss|e-?mail|login|print|reply|share|sign|single/i,
	re_pages = /pag(?:e|ing|inat)/i,
	re_pagenum = /p[ag]{0,2}(?:e|ing|ination)?[=\/]\d{1,2}/i,

	re_safe = /hentry|instapaper_body/,
	re_final = /first|last/i,

	re_positive = /article|body|content|entry|main|news|pag(?:e|ination)|post|text|blog|story/,
	re_negative = /com(?:bx|ment|-)|contact|foot(?:er|note)?|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget/,
	re_unlikelyCandidates = /ad-break|agegate|auth?or|com(?:bx|ment|munity)|disqus|extra|foot|header|ignore|menu|navi|pag(?:er|ination)|popup|postinfo|remark|rss|shoutbox|sidebar|sponsor|tweet|twitter|unrelated/,
	re_okMaybeItsACandidate = /and|article|body|column|main|shadow/,

	re_sentence = /\. |\.$/,
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

	//if path is starting with "/"
	if(path_split[0] === "") path_split.shift();
	else Array.prototype.unshift.apply(path_split, this._url.path);

	path = path_split.join("/");

	if(this._settings.resolvePaths){
		while(path !== (path = path.replace(re_cleanPaths, "")));
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
	href = href.replace(re_closing, "");

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
	if(parsedNum < 10){
		if(parsedNum === 1) score -= 10;
		else score += 10 - parsedNum;
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
Readability.prototype.onopentag = function(name, attributes){
	if(name in noContent){
		if(noContent[name]) this._currentElement.children.push(noContent[name]);
		return;
	}
	//else
	this._currentElement = new Element(name, this._currentElement);

	for(name in attributes) this._onattribute(name, attributes[name]);
};

Readability.prototype._onattribute = function(name, value){
	if(!value) return;

	var elem = this._currentElement;

	if(name === "href" || name === "src"){
	    //fix links
	    if(re_protocol.test(value)) elem.attributes[name] = value;
	    else elem.attributes[name] = this._convertLinks(value);
	}
	else if(name === "id" || name === "class"){
	    value = value.toLowerCase();
	    if(!this._settings.weightClasses);
	    else if(re_safe.test(value)){
	    	elem.attributeScore += 300;
	    	elem.isCandidate = true;
	    }
	    else if(re_negative.test(value)) elem.attributeScore -= 25;
	    else if(re_positive.test(value)) elem.attributeScore += 25;

	    elem.elementData += " " + value;
	}
	else if(this._settings.cleanAttributes){
	    if(name in goodAttributes)
	    	elem.attributes[name] = value;
	}
	else elem.attributes[name] = value;
};

Readability.prototype.ontext = function(text){
	this._currentElement.children.push(text);
};

Readability.prototype.onclosetag = function(tagName){
	if(tagName in noContent) return;

	var elem = this._currentElement, i, j;

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
		i = elem.toString().trim().replace(re_whitespace, " ");
		if(this._origTitle){
			if(this._origTitle.indexOf(i) !== -1){
				if(i.split(" ", 4).length === 4){
					//It's probably the title, so let's use it!
					this._headerTitle = i;
				}
				return;
			}
		}
		//if there was no title tag, use any h1 as the title
		else if(tagName === "h1"){
			this._headerTitle = i;
			return;
		}
	}

	if(tagName in tagsToSkip) return;
	if(this._settings.stripUnlikelyCandidates
		&& re_unlikelyCandidates.test(elem.elementData)
		&& !re_okMaybeItsACandidate.test(elem.elementData)){
			return;
	}
	if(tagName === "div"
		&& elem.children.length === 1
		&& typeof elem.children[0] === "object"
		&& elem.children[0].name in unpackDivs
	){
		//unpack divs
		elem.parent.children.push(elem.children[0]);
		return;
	}

	elem.addInfo();

	//clean conditionally
	if(tagName in removeIfEmpty && elem.info.linkLength + elem.info.textLength === 0){
		if(!("embed" in elem.info.tagCount)
		&& !("iframe" in elem.info.tagCount) 
		&& !("img" in elem.info.tagCount) 
		&& !("object" in elem.info.tagCount)
		) return;
	}
	else if(tagName in embeds){
		//check if tag is wanted (youtube or vimeo)
		if(!("src" in elem.attributes) || !re_videos.test(elem.attributes.src)) return;
	}
	else if(tagName === "h2" || tagName === "h3"){
		//clean headers
		if (elem.attributeScore < 0 || elem.info.density > .33) return;
	}
	else if(this._settings.cleanConditionally && tagName in cleanConditionally){
		var p = elem.info.tagCount.p || 0,
			contentLength = elem.info.textLength + elem.info.linkLength;

		if(contentLength === 0){
			if(elem.children.length === 0) return;
			if("a" in elem.info.tagCount) return;
			if(elem.children.length === 1 && typeof elem.children[0] === "string") return;
		}
		else if(elem.info.tagCount.img > p ) return;
		if((elem.info.tagCount.li - 100) > p && tagName !== "ul" && tagName !== "ol") return;
		if(contentLength < 25 && (!("img" in elem.info.tagCount) || elem.info.tagCount.img > 2) ) return;
		if(elem.info.density > .5) return;
		if(elem.attributeScore < 25 && elem.info.density > .2) return;
		if((elem.info.tagCount.embed === 1 && contentLength < 75) || elem.info.tagCount.embed > 1) return;
	}

	elem.parent.children.push(elem);

	//should node be scored?
	if(tagName in tagsToScore);
	else if(tagName === "div"){
		//check if div should be converted to a p
		for(i = 0, j = divToPElements.length; i < j; i++){
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

var getCandidateSiblings = function(candidate){
	//check all siblings
	var ret = [],
		childs = candidate.parent.children,
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
	var elem = this._topCandidate, elems;
	if(!elem) elem = this._topCandidate = this._currentElement.getTopCandidate();

	if(!elem){
		//select root node
		elem = this._currentElement;
	}
	else if(elem.parent.children.length > 1){
		elems = getCandidateSiblings(elem);

    	//create a new object so that the prototype methods are callable
    	elem = new Element("div")
    	elem.children = elems;
    	elem.addInfo();
    }

	while(elem.children.length === 1){
		if(typeof elem.children[0] === "object"){
			elem = elem.children[0];
		} else break;
	}

	return elem;
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
		//remove spaces in front of <br>s
		.replace(/(?:\s|&nbsp;?)+(?=<br\/>)/g, "")
		//turn all double+ <br>s into <p>s
		.replace(/(?:<br\/>){2,}/g, "</p><p>")
		//remove <br>s in front of opening & closing <p>s
		.replace(/<br\/>(?:\s|&nbsp;?)*(?=<\/?p)/g, "")
		//trim the result
		.trim();
};

Readability.prototype.getText = function(node){
	return (node || this._getCandidateNode()).getFormattedText().trim().replace(/\n+(?=\n{2})/g, "");
};

Readability.prototype.getEvents = function(cbs){
	(function process(node){
		cbs.onopentag(node.name, node.attributes);
		for(var i = 0, j = node.children.length; i < j; i++){
			if(typeof node.children[i] === "string"){
				cbs.ontext(node.children[i]);
			}
			else process(node.children[i]);
		}
		cbs.onclosetag(node.name);
	})(this._getCandidateNode());
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