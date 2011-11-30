//list of values
var tagsToSkip = {textarea:true,head:true,script:true,noscript:true,input:true,select:true,style:true,link:true,aside:true,header:true,nav:true,footer:true},
	tagCounts = {address:-3,article:30,blockquote:3,body:-5,dd:-3,div:5,dl:-3,dt:-3,form:-3,h2:-5,h3:-5,h4:-5,h5:-5,h6:-5,li:-3,ol:-3,pre:3,td:3,th:-5,ul:-3},
	embeds = {embed:true,object:true,iframe:true}, //iframe added for html5 players
	goodAttributes = {href:true,src:true,title:true,alt:true/*,style:true*/},
	cleanConditionaly = {form:true,table:true,ul:true,ol:true,div:true},
	tagsToScore = {p:true,pre:true,td:true},
	newLinesAfter = {br:true,p:true,h2:true,h3:true,h4:true,h5:true,h6:true,li:true},
	newLinesBefore = {p:true,h2:true,h3:true,h4:true,h5:true,h6:true},

	divToPElements = ["a","blockquote","dl","div","img","ol","p","pre","table","ul"],

	re_videos = /http:\/\/(?:www\.)?(?:youtube|vimeo)\.com/,
	re_skipFootnoteLink =/^\s*(?:\[?[a-z\d]{1,2}\]?|^|edit|citation needed)\s*$/i,
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

	re_badStart = /\.(?: |$)/,

	re_pageInURL = /(?:[_-]?p[a-zA-Z]*|[_-])\d{1,2}$/,
	re_badFirst = /^(?:[^a-z]{0,3}|index|\d+)$/i,
	re_noLetters = /[^a-zA-Z]/,
	re_digits = /\d/,
	re_justDigits = /^\d{1,2}$/,
	re_slashes = /\/+/,

	re_protocol = /^\w+\:/,
	re_cleanPaths = /\/\.(?!\.)|\/[^\/]*\/\.\./g,
	
	re_closing = /\/?(?:#.*)?$/,

	re_commas	 = /,[\s\,]*/g;

//the tree element
var Element = function(tagName){
		this.name = tagName;
		this.attributes = {};
		this.children = [];
		this.skip = false;
		this.tagScore = 0;
		this.attributeScore = 0;
		this.totalScore = 0;
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
			else if(!elem.skip){
				if(elem.name === "a"){
					info.linkLength += elem.info.textLength + elem.info.linkLength;
				}
				else{
					info.textLength += elem.info.textLength;
					info.linkLength += elem.info.linkLength;
				}
				info.commas += elem.info.commas;

				for(var j in elem.info.tagCount){
					if(info.tagCount[j]) info.tagCount[j] += elem.info.tagCount[j];
					else info.tagCount[j] = elem.info.tagCount[j];
				}

				if(info.tagCount[elem.name]) info.tagCount[elem.name] += 1;
				else info.tagCount[elem.name] = 1;
			}
		}
		info.density = info.linkLength / (info.textLength + info.linkLength);
		if(isNaN(info.density))
			info.density = 1; //just ensure it gets skipped (is the case for 0/0)
		return info;
	},
	getOuterHTML: function(){
		if(this.skip) return "";
		var ret = "<" + this.name,
			i;

		for(i in this.attributes)
			if(this.attributes.hasOwnProperty(i))
				ret += " " + i + "=\"" + this.attributes[i] + "\"";

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
	getText: function(){
		var nodes = this.children, ret = "", text;
		for(var i = 0, j = nodes.length; i < j; i++){
			if(typeof nodes[i] === "string") ret += nodes[i];
			else if(!nodes[i].skip){
				text = nodes[i].getText();

				if(text === "") continue;

				if(newLinesBefore[ nodes[i].name ]) ret += "\n";

				ret += text;

				if(newLinesAfter[ nodes[i].name ]) ret +=	"\n";
			}
		}
		return ret;
	}
};

//helper functions

var Readability = function(settings){
	//our tree (used instead of the dom)
	this._docElements = [new Element("document")];
	this._topCandidate = this._topParent = null;
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
	/*
	pageURL: null,		//URL of the page which is parsed
	*/
	resolvePaths: false,//indicates wheter ".." and "." inside paths should be eliminated
	log : typeof console === "undefined" ? function(){} : console.log
};

Readability.prototype._convertLinks = function(path){
	if(!this._url) return path;
	if(!path) return this._url.full;

	//Fix javascript:, mailto: links
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
	else path_split = this._url.path.concat(path_split);

	path = path_split.join("/");
	
	if(this._settings.resolvePaths){
		//this will delete most constructs, but not any
		path = path.replace(re_cleanPaths, "");
	}

	return this._url.protocol + "//" + this._url.domain + "/" + path;
};

Readability.prototype._getBaseURL = function(){
	if(this._url.path.length < 2){
		//return what we got
		return this._url.full.replace(/\?\.*/,"");
	}

	var urlSlashes		= this._url.path.reverse(),
		cleanedSegments = [];

	//look if the first to elements get skipped
	var pos = this._url.full.indexOf("?");
	if(pos === -1) pos = Infinity;
	
	var first = this._url.full.substring(this._url.full.lastIndexOf("/")+1, pos),
		second = urlSlashes[0];

	if((second.length < 3 && re_noLetters.test(first)) || re_justDigits.test(second)){
		urlSlashes.shift(); //remove second element
	}
	else if(re_pageInURL.test(second)){
		urlSlashes[0] = second.replace(re_pageInURL, "");
	}
	
	if(!re_badFirst.test(first)){
		if(re_pageInURL.test(first)){
			first = first.replace(re_pageInURL, "");
		}
		urlSlashes.unshift(first);
	}

	var dotSplit, segment;

	for(var i = 0, j = urlSlashes.length; i < j; i++){
		// Split off and save anything that looks like a file type.
		dotSplit = urlSlashes[i].split(".", 3);

		//change from Readability: ensure that segments with multiple points get skipped
		if (dotSplit.length === 2 && !re_noLetters.test(dotSplit[1]))
			segment = dotSplit[0];
		else segment = urlSlashes[i];

		if(segment.indexOf(",00") !== -1)
			segment = segment.replace(",00", "");

		cleanedSegments.push(segment);
	}

	// This is our final, cleaned, base article URL.
	return this._url.protocol + "//" + this._url.domain + "/" + cleanedSegments.reverse().join("/");
};

Readability.prototype._processSettings = function(settings){
	var Settings = this._settings;
	this._settings = {};
	
	var link;

	for(var i in Settings){
		if(typeof settings[i] !== "undefined")
			this._settings[i] = settings[i];
		else this._settings[i] = Settings[i];
	}

	if(settings.log === false) this._settings.log = function(){};
	
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
};

Readability.prototype._scanLink = function(elem){
	var href = elem.attributes.href;

	if(!href) return;

	href = this._convertLinks(href.replace(re_closing, ""));
	
	if(this._settings.linksToSkip[href]) return;

	if(href === this._baseURL || (this._url && href === this._url.full)) return;
	
	if(this._url && href.split(re_slashes, 2)[1] !== this._url.full.split(re_slashes, 2)[1]) return;

	var text = elem.getText();

	if(text.length > 25 || re_extraneous.test(text)) return;
	if(!re_digits.test(href.replace(this._baseURL, ""))) return;

	var score = 0,
		linkData = text + " " + elem.attributes["class"] + " " + elem.attributes.id;

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

	var pos = this._docElements.length,
		posMatch = true,
		negMatch = true,
		parentData = "";

	while(--pos !== 0){
		parentData = this._docElements[pos].attributes["class"] + " " + this._docElements[pos].attributes.id;
		if(parentData === " ") continue;
		if(posMatch && re_pages.test(parentData)){
			score += 25;
			if(!negMatch) break;
			else posMatch = false;
		}
		if(negMatch && re_negative.test(parentData) && !re_positive.test(parentData)){
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

	if(this._scannedLinks[href]){
		this._scannedLinks[href].score += score;
		this._scannedLinks[href].text += " | " + text;
	}
	else this._scannedLinks[href] = {
			score: score,
			text: text
		};
};

//parser methods
Readability.prototype.onopentag = function(tagName, attributes){
	var parent = this._docElements[this._docElements.length - 1],
		elem = new Element(tagName);

	this._docElements.push(elem);

	if(parent.skip === true || tagsToSkip[tagName]){
		elem.attributes = attributes;
		elem.skip = true;
		return;
	}

	var value;

	if(this._settings.stripUnlikelyCandidates){
		value = ((attributes.id || "") + (attributes["class"] || "")).toLowerCase();
		if(re_unlikelyCandidates.test(value) && !re_okMaybeItsACandidate.test(value)){
				elem.skip = true; return;
		}
	}

	for(var name in attributes){
		value = attributes[name];

		if(name === "id" || name === "class"){
			value = value.toLowerCase();
			if(re_safe.test(value)) elem.attributeScore += 300;
			else if(re_negative.test(value)) elem.attributeScore -= 25;
			else if(re_positive.test(value)) elem.attributeScore += 25;

			elem.attributes[name] = value;
		}
		else if(name === "href" || name === "src"){
			//fix links
			elem.attributes[name] = this._convertLinks(value);
		}
		else if(this._settings.cleanAttributes){
			if(goodAttributes[name])
				elem.attributes[name] = value;
		}
		else elem.attributes[name] = value;
	}

	//add points for the tags name
	if(tagCounts[tagName]) elem.tagScore += tagCounts[tagName];

	//do this now, so gc can remove it after onclosetag
	parent.children.push(elem);
};

Readability.prototype.ontext = function(text){ this._docElements[this._docElements.length-1].children.push(text); };

Readability.prototype.onclosetag = function(tagname){
	var elem = this._docElements.pop(),
		elemLevel = this._docElements.length - 1;

	//if(tagname !== elem.name) this._settings.log("Tagname didn't match!:", tagname, "vs.", elem.name);

	//prepare title
	if(this._settings.searchFurtherPages && tagname === "a"){
		this._scanLink(elem);
	}
	else if(tagname === "title") this._origTitle = elem.getText();
	else if(tagname === "h1"){
		elem.skip = true;
		if(this._headerTitle !== false)
			if(!this._headerTitle) this._headerTitle = elem.getText();
			else this._headerTitle = false;
	}

	if(elem.skip) return;

	elem.addInfo();

	var i, j, cnvrt;
	//clean conditionally
	if(tagname === "p"){
		if(!elem.info.tagCount.img && !elem.info.tagCount.embed && !elem.info.tagCount.object 
			&& elem.info.linkLength === 0 && elem.info.textLength === 0)
				elem.skip = true;
	}
	else if(embeds[tagname]){
		//check if tag is wanted (youtube or vimeo)
		cnvrt = true;
		for(i in elem.attributes){
			if(re_videos.test(elem.attributes[i])){
				cnvrt = false;
				break;
			}
		}

		if(cnvrt) elem.skip = true;
	}
	else if(tagname === "h2" || tagname === "h3"){
		//clean headers
		if (elem.attributeScore < 0 || elem.info.density > 0.33) elem.skip = true;
	}
	else if(this._settings.cleanConditionally && cleanConditionaly[tagname]){
		var p = elem.info.tagCount.p || 0,
			contentLength = elem.info.textLength + elem.info.linkLength;

		if( elem.info.tagCount.img > p ) elem.skip = true;
		else if( (elem.info.tagCount.li - 100) > p && tagname !== "ul" && tagname !== "ol") elem.skip = true;
		else if(elem.info.tagCount.input > Math.floor(p/3) ) elem.skip = true;
		else if(contentLength < 25 && (!elem.info.tagCount.img || elem.info.tagCount.img > 2) ) elem.skip = true;
		else if(elem.attributeScore < 25 && elem.info.density > 0.2) elem.skip = true;
		else if(elem.attributeScore >= 25 && elem.info.density > 0.5) elem.skip = true;
		else if((elem.info.tagCount.embed === 1 && contentLength < 75) || elem.info.tagCount.embed > 1) elem.skip = true;
	}

	if(elem.skip) return;

	//should node be scored?
	var score = tagsToScore[tagname];
	if(!score && tagname === "div"){
		cnvrt = true;
		for(i = 0, j = divToPElements.length; i < j; i++)
			if(elem.info.tagCount[divToPElements[i]]) cnvrt = false;

		if(cnvrt){
			elem.name = "p";
			score = true;
		}
	}
	if(score){
		if((elem.info.textLength + elem.info.linkLength) >= 25 && elemLevel > 0){
			this._docElements[elemLevel].isCandidate = this._docElements[elemLevel-1].isCandidate = true;
			var addScore = 1 + elem.info.commas + Math.min( Math.floor( (elem.info.textLength + elem.info.linkLength) / 100 ), 3);
			this._docElements[elemLevel].tagScore	+= addScore;
			this._docElements[elemLevel-1].tagScore	+= addScore / 2;
		}
	}

	if(elem.isCandidate){
		elem.totalScore = Math.floor((elem.tagScore + elem.attributeScore) * (1 - elem.info.density));
		if(!this._topCandidate || elem.totalScore > this._topCandidate.totalScore){
			this._topCandidate = elem;
			if(elemLevel >= 0)
				this._topParent = this._docElements[elemLevel];
			else
				this._topParent = null;
		}
	}
};

Readability.prototype.onreset = Readability;

Readability.prototype._getCandidateSiblings = function(){
	var tmp;
	if(!this._topCandidate){
		if((tmp = this._docElements) 
			&& (tmp = tmp[0]) && (tmp = tmp.children) 
			&& (tmp = tmp[tmp.length-1]) && (tmp = tmp.children) 
			&& (tmp = tmp[tmp.length-1])){
			//use body	
			this._topCandidate = tmp;
		}
		else this._topCandidate = new Element("");
		this._topCandidate.name = "div";
	}
	//check all siblings
	if(!this._topParent)
		return [this._topCandidate];

	var ret = [],
		childs = this._topParent.children,
		childNum = childs.length,
		siblingScoreThreshold = Math.max(10, this._topCandidate.totalScore * 0.2);

	for(var i = 0; i < childNum; i++){
		if(typeof childs[i] === "string") continue;
		var append = false;
		if(childs[i] === this._topCandidate) append = true;
		else{
			var contentBonus = 0;
			if(this._topCandidate.attributes["class"] && this._topCandidate.attributes["class"] === childs[i].attributes["class"])

				contentBonus += this._topCandidate.totalScore * 0.2;
			if((childs[i].totalScore + contentBonus) >= siblingScoreThreshold) append = true;
			else if(childs[i].name === "p")
				if(childs[i].info.textLength > 80 && childs[i].info.density < 0.25) append = true;
				else if(childs[i].info.textLength < 80 && childs[i].info.density === 0 && re_badStart.test(childs[i].getText()))
					append = true;
		}
		if(append){
			if(childs[i].name !== "p")
				childs[i].name = "div";

			ret.push(childs[i]);
		}
	}
	return ret;
};

//skipLevel is a shortcut to allow more elements of the page
Readability.prototype.setSkipLevel = function(skipLevel){
	//if the prototype is still used for settings
	if(this._settings === Readability.prototype._settings){
		this._processSettings({});
	}

	if(this._settings.skipLevel > 0) this._settings.stripUnlikelyCandidates = false;
	if(this._settings.skipLevel > 1) this._settings.weightClasses = false;
	if(this._settings.skipLevel > 2) this._settings.cleanConditionally = false;
};

Readability.prototype.getTitle = function(){
	var origTitle = this._origTitle,
		curTitle = origTitle || "";

	if(/ [\|\-] /.test(curTitle)){
		curTitle = origTitle.replace(/(.*)[\|\-] .*/g,"$1");

		if(curTitle.split(" ", 3).length < 3)
			curTitle = origTitle.replace(/[^\|\-]*[\|\-](.*)/g,"$1");
	}
	else if(curTitle.indexOf(": ") !== -1){
		curTitle = origTitle.replace(/.*:(.*)/g,"$1");

		if(curTitle.split(" ", 3).length < 3)
			curTitle = origTitle.replace(/[^:]*[:](.*)/g,"$1");
	}
	else if(curTitle.length > 150 || curTitle.length < 15)
		if(this._headerTitle) curTitle = this._headerTitle;

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

	//if(topScore !== 49) this._settings.log("Top link score:", topScore);

	return topLink;
};

Readability.prototype.getArticle = function(type){
	//create a new object so that the prototype methods are callable
	var elem = new Element("");
	elem.children = this._getCandidateSiblings();
	elem.addInfo();

	var ret = {
		title: this.getTitle(),
		nextPage: this.getNextPage(),
		textLength: elem.info.textLength,
		score: this._topCandidate.totalScore
	};
	
	//if(elem.info.tagCount.h2 === 1){}

	if(type === "text")
		ret.text = elem.getText().trim();

	else ret.html = elem.getInnerHTML() //=> clean it
		//kill breaks
		.replace(/(?:<\/?br\s*\/?>(?:\s|&nbsp;?)*)+/g,'<br/>')
		//turn all double brs into ps
		.replace(/(?:<br[^>]*>[ \n\r\t]*){2,}/g, '</p><p>')
		//remove font tags
		.replace(/<(\/?)font[^>]*>/g, '<$1span>')
		//remove breaks in front of paragraphs
		.replace(/<br[^>]*>\s*<p/g,"<p");

	return ret;
};

if(typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = Readability;