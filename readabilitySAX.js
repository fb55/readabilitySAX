module.exports = Readability;

var Element = require("./lib/element.js");

var tagsToSkip = {__proto__:null,aside:true,footer:true,head:true,label:true,nav:true,noscript:true,script:true,select:true,style:true,textarea:true},
    removeIfEmpty = {__proto__:null,blockquote:true,li:true,p:true,pre:true,tbody:true,td:true,th:true,thead:true,tr:true},
    embeds = {__proto__:null,embed:true,object:true,iframe:true}, //iframe added for html5 players
    goodAttributes = {__proto__:null,alt:true,href:true,src:true,title:true/*,style:true*/},
    cleanConditionally = {__proto__:null,div:true,form:true,ol:true,table:true,ul:true},
    unpackDivs = {__proto__:embeds,div:true,img:true},
    formatTags = {__proto__:null,br:new Element("br"),hr:new Element("hr")},
    noContent = {__proto__:formatTags,font:false,input:false,link:false,meta:false,span:false},
    
    headerTags = {__proto__:null,h1:true,h2:true,h3:true,h4:true,h5:true,h6:true},

    divToPElements = ["a","blockquote","dl","img","ol","p","pre","table","ul"],
    okayIfEmpty = ["audio","embed","iframe","img","object","video"],

    re_videos = /http:\/\/(?:www\.)?(?:youtube|vimeo)\.com/,
    re_nextLink = /[>»]|continue|next|weiter(?:[^\|]|$)/i,
    re_prevLink = /[<«]|earl|new|old|prev/i,
    re_extraneous = /all|archive|comment|discuss|e-?mail|login|print|reply|share|sign|single/i,
    re_pages = /pag(?:e|ing|inat)/i,
    re_pagenum = /p[ag]{0,2}(?:e|ing|ination)?[=\/]\d{1,2}/i,

    re_safe = /article-body|hentry|instapaper_body/,
    re_final = /first|last/i,

    re_positive = /article|blog|body|content|entry|main|news|pag(?:e|ination)|post|story|text/,
    re_negative = /com(?:bx|ment|-)|contact|foot(?:er|note)?|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget/,
    re_unlikelyCandidates =  /ad-break|agegate|auth?or|bookmark|cat|com(?:bx|ment|munity)|date|disqus|extra|foot|header|ignore|links|menu|nav|pag(?:er|ination)|popup|related|remark|rss|share|shoutbox|sidebar|similar|social|sponsor|teaserlist|time|tweet|twitter/,
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
    re_imgUrl = /\.(?:gif|jpe?g|png|webp)$/i;

function Readability(settings){
	//the root node
	this._currentElement = new Element("document");
	this._topCandidate = null;
	this._origTitle = this._headerTitle = "";
	this._scannedLinks = {};
	this._url = settings && settings.pageURL ? parseURL(settings.pageURL) : null;
	this._baseURL = this._url ? getBaseURL(this._url) : "";
	this._settings = settings ? processSettings(settings) : defaultSettings;
}

var defaultSettings = {
	stripUnlikelyCandidates: true,
	weightClasses: true,
	cleanConditionally: true,
	cleanAttributes: true,
	replaceImgs: true,
	searchFurtherPages: true,
	linksToSkip: {},	//pages that are already parsed
	//pageURL: null,	//URL of the page which is parsed
	type: "html",		//default type of output
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

function getBaseURL(url){
	if(url.path.pathname === "/"){
		//return what we got
		return url.full.replace(re_params,"");
	}

	var cleaned = "",
	    elementNum = url.path.length - 1;

	for(var i = 0; i < elementNum; i++){
		// Split off and save anything that looks like a file type and "00,"-trash.
		cleaned += "/" + url.path[i].replace(re_extension, "");
	}

	var first = url.full.replace(re_params, "").replace(/.*\//, ""),
	    second = url.path[elementNum];

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
	return url.protocol + "//" + url.domain + cleaned;
}

function processSettings(settings){
	var newSettings = {};

	for(var i in defaultSettings){
		if(typeof settings[i] !== "undefined"){
			newSettings[i] = settings[i];
		}
		else newSettings[i] = defaultSettings[i];
	}

	return newSettings;
}

function parseURL(url){
	var path = url.split(re_slashes);

	return {
		protocol: path[0],
		domain: path[1],
		path: path.slice(2, -1),
		full: url.replace(re_closing,"")
	};
}

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

	while((current = current.parent)){
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
Readability.prototype.onopentagname = function(name){
	if(name in noContent){
		if(name in formatTags) this._currentElement.children.push(formatTags[name]);
	}
	else this._currentElement = new Element(name, this._currentElement);
};

Readability.prototype.onattribute = function(name, value){
	if(!value) return;
	name = name.toLowerCase();

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
	else if(elem.name === "img" && (name === "width" || name === "height")){
		value = parseInt(value, 10);
		if(value !== value); // NaN (skip)
		else if(value <= 32) {
			// skip the image
			// (use a tagname that's part of tagsToSkip)
			elem.name = "script";
		}
		else if(name === "width" ? value >= 390 : value >= 290){
			// increase score of parent
			elem.parent.attributeScore += 20;
		}
		else if(name === "width" ? value >= 200 : value >= 150){
			elem.parent.attributeScore += 5;
		}
	}
	else if(this._settings.cleanAttributes){
		if(name in goodAttributes) elem.attributes[name] = value;
	}
	else elem.attributes[name] = value;
};

Readability.prototype.ontext = function(text){
	this._currentElement.children.push(text);
};

Readability.prototype._processHeader = function(elem){
	var title = elem.toString().trim().replace(re_whitespace, " ");

	if(this._origTitle){
		if(this._origTitle.indexOf(title) !== -1){
			if(title.split(" ", 4).length === 4){
				//It's probably the title, so let's use it!
				this._headerTitle = title;
			}
			return;
		}
		return elem.name === "h1";
	}

	//if there was no title tag, use any h1 as the title
	if(elem.name === "h1"){
		this._headerTitle = title;
		return true;
	}

	return false;
};

function cleanConditionally_(elem){
	if(elem.name in cleanConditionally){
		var p = elem.info.tagCount.p || 0,
		    contentLength = elem.info.textLength + elem.info.linkLength;

		if(contentLength === 0){
			if(elem.children.length === 0) return true;
			if(elem.children.length === 1 && typeof elem.children[0] === "string") return true;
		}
		if(
			((elem.info.tagCount.li - 100) > p && elem.name !== "ul" && elem.name !== "ol") ||
			(contentLength < 25 && (!("img" in elem.info.tagCount) || elem.info.tagCount.img > 2)) ||
			elem.info.density > .5 ||
			(elem.attributeScore < 25 && elem.info.density > .2) ||
			((elem.info.tagCount.embed === 1 && contentLength < 75) || elem.info.tagCount.embed > 1)
		) return true;
	}
}

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
		if(this._processHeader(elem)) return;
	}

	if(tagName in tagsToSkip) return;
	if(
		this._settings.stripUnlikelyCandidates &&
		re_unlikelyCandidates.test(elem.elementData) &&
		!re_okMaybeItsACandidate.test(elem.elementData)
	){
			return;
	}
	if(
		tagName === "div" &&
		elem.children.length === 1 &&
		typeof elem.children[0] === "object" &&
		elem.children[0].name in unpackDivs
	){
		//unpack divs
		elem.parent.children.push(elem.children[0]);
		return;
	}

	elem.addInfo();

	//clean conditionally
	if(tagName in embeds){
		//check if tag is wanted (youtube or vimeo)
		if(!("src" in elem.attributes && re_videos.test(elem.attributes.src))) return;
	}
	else if(tagName === "h2" || tagName === "h3"){
		//clean headers
		if (elem.attributeScore < 0 || elem.info.density > .33) return;
	}
	else if(this._settings.cleanConditionally && cleanConditionally_(elem)) return;


	filterEmpty:
	if(
		(
			tagName in removeIfEmpty ||
			!this._settings.cleanConditionally &&
			tagName in cleanConditionally
		) && (
			elem.info.linkLength + elem.info.textLength === 0
		) && elem.children.length !== 0
	){
		for(i = 0, j = okayIfEmpty.length; i < j; i++){
			if(okayIfEmpty[i] in elem.info.tagCount) break filterEmpty;
		}
		return;
	}

	if(
		this._settings.replaceImgs &&
		tagName === "a" &&
		elem.children.length === 1 &&
		elem.children[0].name === "img" &&
		re_imgUrl.test(elem.attributes.href)
	){
		elem = elem.children[0];
		elem.attributes.src = elem.parent.attributes.href;
	}

	elem.parent.children.push(elem);

	//should node be scored?
	if(tagName === "p" || tagName === "pre" || tagName === "td");
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

function getCandidateSiblings(candidate){
	//check all siblings
	var ret = [],
	    childs = candidate.parent.children,
	    childNum = childs.length,
	    siblingScoreThreshold = Math.max(10, candidate.totalScore * .2);

	for(var i = 0; i < childNum; i++){
		if(typeof childs[i] === "string") continue;

		if(childs[i] === candidate);
		else if(candidate.elementData === childs[i].elementData){ //TODO: just the class name should be checked
			if((childs[i].totalScore + candidate.totalScore * .2) >= siblingScoreThreshold){
				if(childs[i].name !== "p") childs[i].name = "div";
			}
			else continue;
		} else if(childs[i].name === "p"){
			if(childs[i].info.textLength >= 80 && childs[i].info.density < .25);
			else if(childs[i].info.textLength < 80 && childs[i].info.density === 0 && re_sentence.test(childs[i].toString()));
			else continue;
		} else continue;

		ret.push(childs[i]);
	}
	return ret;
}



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
		elem = new Element("div");
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
	if(this._headerTitle) return this._headerTitle;
	if(!this._origTitle) return "";

	var curTitle = this._origTitle;

	if(/ [\|\-] /.test(curTitle)){
		curTitle = curTitle.replace(/(.*) [\|\-] .*/g, "$1");

		if(curTitle.split(" ", 3).length !== 3)
			curTitle = this._origTitle.replace(/.*?[\|\-] /,"");
	}
	else if(curTitle.indexOf(": ") !== -1){
		curTitle = curTitle.substr(curTitle.lastIndexOf(": ") + 2);

		if(curTitle.split(" ", 3).length !== 3)
			curTitle = this._origTitle.substr(this._origTitle.indexOf(": "));
	}
	//TODO: support arrow ("\u00bb")

	curTitle = curTitle.trim();

	if(curTitle.split(" ", 5).length !== 5) return this._origTitle;
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
	if(!node) node = this._getCandidateNode();
	return node.getInnerHTML() //=> clean it
		//remove <br>s in front of opening & closing <p>s
		.replace(/(?:<br\/>(?:\s|&nbsp;?)*)+(?=<\/?p)/g, "")
		//remove spaces in front of <br>s
		.replace(/(?:\s|&nbsp;?)+(?=<br\/>)/g, "")
		//turn all double+ <br>s into <p>s
		.replace(/(?:<br\/>){2,}/g, "</p><p>")
		//trim the result
		.trim();
};

Readability.prototype.getText = function(node){
	if(!node) node = this._getCandidateNode();
	return node.getFormattedText().trim().replace(/\n+(?=\n{2})/g, "");
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
		title: this._headerTitle || this.getTitle(),
		nextPage: this.getNextPage(),
		textLength: elem.info.textLength,
		score: this._topCandidate ? this._topCandidate.totalScore : 0
	};

	if(!type && this._settings.type) type = this._settings.type;

	if(type === "text") ret.text = this.getText(elem);
	else ret.html = this.getHTML(elem);

	return ret;
};
