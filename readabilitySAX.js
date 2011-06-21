var readability = typeof exports === "undefined" ? {} : exports;

readability.process = function(parser, options){
	//our tree (used instead of the dom)
	var docElements = [{name:"document", attributes: [], children: []}],
		elemLevel = 0,
		topCandidate = null,
		origTitle, curTitle;
	
	//settings
	options = options || {};
	var settings = {
		stripUnlikelyCandidates: typeof options.stripUnlikelyCandidates === "boolean" ? options.stripUnlikelyCandidates : true,
		weightClasses: typeof options.weightClasses === "boolean" ? options.weightClasses : true,
		stripAttributes: typeof options.stripAttributes === "boolean" ? options.stripAttributes : true,
		convertLinks: typeof options.convertLinks === "function" ? options.convertLinks : function(a){return a;},
		pageURL: typeof options.pageURL === "string" ? options.pageURL : "",
		log : typeof options.log === "boolean" ? options.log : true
	};
	
	//lists of elems for score
	//tags
	var tagsToSkip = ["textarea","head","script","noscript","input","select","style","link"],
		tagsToCount = ["img","embed","audio","video"],
		goodAttributes = ["href","src","title","alt","style"],
		greatTags = ["div", "article"],
		goodTags = ["pre", "td", "blockquote"],
		badTags = ["address", "ol", "ul", "dl", "dd", "dt", "li", "form"],
		worstTags = ["h1", "h2", "h3", "h4", "h5", "h6", "th", "body"],
		cleanConditionaly = ["form","table","ul","div"],
		tagsToScore = ["p","pre","td"],
		divToPElements = ["a", "blockquote", "dl", "div", "img", "ol", "p", "pre", "table", "ul"],
		//classes and ids
		unlikelyCandidates = ["combx", "comment", "community", "disqus", "extra", "foot", "header", "menu", "remark", "rss", "shoutbox", "sidebar", "sponsor", "ad-break", "agegate", "pagination", "pager", "popup", "tweet", "twitter"],
		okMaybeItsACandidate = ["and", "article", "body", "column", "main", "shadow"],
		extraneous = ["print", "archive", "comment", "discuss", "email", "mail", "e-mail", "share", "reply", "all", "login", "sign", "single"],
		regexps = {
			videos:			 /http:\/\/(www\.)?(youtube|vimeo)\.com/i,
			skipFootnoteLink:/^\s*(\[?[a-z0-9]{1,2}\]?|^|edit|citation needed)\s*$/i,
			nextLink:		 /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
			prevLink:		 /(prev|earl|old|new|<|«)/i,
			
			positive:		/article|body|content|entry|hentry|main|page|pagination|post|text|blog|story/,
			negative:		/combx|comment|com-|contact|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget/,
			unlikelyCandidates:/combx|comment|community|disqus|extra|foot|header|menu|remark|rss|shoutbox|sidebar|sponsor|ad-break|agegate|pagination|pager|popup|tweet|twitter/,
			okMaybeItsACandidate:  /and|article|body|column|main|shadow/,
			
			headers: /h[1-3]/,
			commas : /,[\s\,]{0,}/g
		};
	
	//helper functions
	var isPartOfArray = function(arr, elem, startIndex){
		if(!startIndex) startIndex = 0;
		var indx = arr.indexOf(elem, startIndex);
		if(indx >= 0){
			if(arr[indx] === elem) return true;
			else return isPartOfArray(arr, elem, indx+1);
		}
		else return false;
	},
	log = function(){
		if(!settings.log) return;
		/*global console, y*/
		if(console && console.log) console.log.apply(this, arguments);
		else if(y && y.log) y.log.apply(this, arguments);
		//else if(window && window.alert) window.alert(msg);
	},
	addInfo = function(node){
		var info = node.info,
			childs = node.children;
		for(var i=0, elem; (elem = childs[i]); i++){
			if(typeof childs[i] === "string"){
				info.textLength += elem.length;
				info.commas += elem.split(regexps.commas).length - 1;
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
				if(info.tagCount[elem.name]) info.tagCount[elem.name]++;
				else info.tagCount[elem.name] = 1;
			}
		}
		info.density = info.linkLength / (info.textLength + info.linkLength);
		node.info = info;
	},
	getInnerHTML = function(elem){
		var ret = "";
		for(var i = 0, j = elem.children.length; i < j; i++){
			if(typeof elem.children[i] === "string") ret += " " + elem.children[i];
			else ret += " " + getOuterHTML(elem.children[i]);
		}
		return ret.trim();
	},
	getOuterHTML = function(elem){
		if(elem.skip) return "";
		var ret = "<" + elem.name;
		for(var i in elem.attributes)
			if(settings.stripAttributes){
				if(isPartOfArray(goodAttributes, i)){
					ret += " " + i + "=\"" + elem.attributes[i] + "\"";
				}
			} else{
				ret += " " + i + "=\"" + elem.attributes[i] + "\"";
			}
		
		ret += ">" + getInnerHTML(elem);
		
		return ret + "</" + elem.name + ">";
	},
	getInnerText = function(elem){
		var ret = "";
		for(var i = 0, j = elem.children.length; i < j; i++){
			if(typeof elem.children[i] === "string") ret += " " + elem.children[i];
			else ret += " " + getInnerText(elem.children[i]);
		}
		return ret.trim();
	};
	
	
	parser.onopentag = function(tag){
		var parent = docElements[elemLevel++],
			tagName = tag.name;
		
		var elem = parent.children[parent.children.length] = docElements[elemLevel] = { 
			name: tagName, attributes: tag.attributes, children: [], skip: false,
			scores: {
				attribute: 0,
				tag:0,
				total: 0
			},
			info: {
				textLength: 0,
				linkLength: 0,
				commas:		0,
				density:	0,
				tagCount:	{}
			}
		};
		
		if(parent.skip === true){
			elem.skip = true; return;
		}
		
		if(isPartOfArray(tagsToSkip, tagName)){
			elem.skip = true; return;
		}
		
		var id = (tag.attributes.id || "").toLowerCase(),
			className = (tag.attributes["class"] || "").toLowerCase();
		
		if(settings.stripUnlikelyCandidates){
			var matchString = id + className;
			if(regexps.unlikelyCandidates.test(matchString) && 
				!regexps.okMaybeItsACandidate.test(matchString)){
					elem.skip = true; return;
			}
		}
		
		//add points for the tags name
		if(tagName === "article") elem.scores.tag += 30;
		else if(tagName === "div") elem.scores.tag += 5;
		else if(isPartOfArray(goodTags, tagName)) elem.scores.tag += 3;
		else if(isPartOfArray(badTags, tagName)) elem.scores.tag -= 3;
		else if(isPartOfArray(worstTags, tagName)) elem.scores.tag -= 5;
		
		//add points for the tags id && classnames
		if(id !== ""){
		    if(regexps.negative.test(id)) elem.scores.attribute -= 25;
		    else if(regexps.positive.test(id)) elem.scores.attribute += 25;
		}
		if(className !== ""){
		    if(regexps.negative.test(className)) elem.scores.attribute -= 25;
		    else if(regexps.positive.test(className)) elem.scores.attribute += 25;
		}
	};
	
	parser.ontext = function(text){ docElements[elemLevel].children.push(text); };
	
	parser.onclosetag = function(tagname){
		var elem = docElements[elemLevel--];
		if(tagname !== elem.name) log("Tagname didn't match!:" + tagname + " vs. " + elem.name);
		
		//prepare title
		if(tagname === "title") origTitle = getInnerText(elem);
		else if(tagname === "h1"){
			elem.skip = true;
			if(curTitle !== false)
				if(!curTitle) curTitle = getInnerText(elem);
				else curTitle = false;
		}
		
		if(elem.skip) return;
		
		addInfo(elem);
		
		var i, j, cnvrt;
		//clean conditionally
		if(tagname === "p")
			if(!elem.info.tagCount.img && !elem.info.tagCount.embed && !elem.info.tagCount.object && elem.info.linkLength === 0 && elem.info.textLength === 0)
				elem.skip = true;
		else if(tagname === "embed" || tagname === "object"){
			//check if tag is wanted (youtube or vimeo)
			cnvrt = true;
			for(i in elem.attributes)
				if(regexps.videos.test(i)) cnvrt = false;
			
			if(cnvrt) elem.skip = true;
		}
		else if(regexps.headers.test(tagname))
			//clean headers
			if (elem.scores.attribute < 0 || elem.info.density > 0.33) elem.skip = true;
		else if(isPartOfArray(cleanConditionaly, tagname)){
			var p = elem.info.tagCount.p || 0,
				contentLength = elem.info.textLength + elem.info.linkLength;
			if( elem.info.tagCount.img > p ) elem.skip = true;
			else if( (elem.info.tagCount.li - 100) > p && tagname !== "ul" && tagname !== "ol") elem.skip = true;
			else if(elem.info.tagCount.input > Math.floor(p/3) ) elem.skip = true;
			else if(contentLength < 25 && (!elem.info.tagCount.img || elem.info.tagCount.img > 2) ) elem.skip = true;
			else if(elem.scores.attribute < 25 && elem.scores.density > 0.2) elem.skip = true;
			else if(elem.scores.attribute >= 25 && elem.scores.density > 0.5) elem.skip = true;
			else if((elem.info.tagCount.embed === 1 && contentLength < 75) || elem.info.tagCount.embed > 1) elem.skip = true;
		}
		
		if(elem.skip) return;
		
		//fix link
		if(elem.attributes.href) elem.attributes.href = settings.convertLinks(elem.attributes.href);
		if(elem.attributes.src)  elem.attributes.src  = settings.convertLinks(elem.attributes.src);
		
		//should node be scored?
		var score = isPartOfArray(tagsToScore, tagname);
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
			if((elem.info.textLength + elem.info.linkLength) >= 25 && elemLevel > 0){ //elemLevel was already decrased
				docElements[elemLevel].isCandidate = docElements[elemLevel-1].isCandidate = true;
				var addScore = 1 + elem.info.commas + Math.min( Math.floor( (elem.info.textLength + elem.info.linkLength) / 100 ), 3);
				docElements[elemLevel].scores.tag		+= addScore;
				docElements[elemLevel-1].scores.tag	+= addScore / 2;
			}
		}
		
		if(elem.isCandidate){
			elem.scores.total = Math.floor((elem.scores.tag + elem.scores.attribute) * (1 - elem.info.density));
			if(!topCandidate || elem.scores.total > topCandidate.scores.total) topCandidate = elem;
		}
	};
	
	var getCleanedNodeContent = function(node, type){
		var content;
		if(type === "element")
			content = getOuterHTML(node);
		else content = getInnerHTML(node);
		
		if(!content) return log(node);
		
		return content
			//kill breaks
			.replace(/(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,'<br/>')
			//turn all double brs into ps
			.replace(/(<br[^>]*>[ \n\r\t]*){2,}/g, '</p><p>')
			.replace(/<(\/?)font[^>]*>/g, '<$1span>')
			//remove breaks in front of paragraphs
			.replace(/<br[^>]*>\s*<p/g,"<p");
	};
	this.getTitle = function(){
		var retTitle = origTitle;
		
		return retTitle;
	};
	this.getArticle = function(type){
		if(!topCandidate)
			return {
				title:	"Error",
				text:	"Couldn't find content!",
				html:	"<b>Couldn't find content!</b>",
				error: true
			};
		var ret = {
			title: this.getTitle(),
			score: topCandidate.scores.total,
			nextPage: "" //TODO
		};
		if(type === "node") ret.node = topCandidate;
		else if(type === "text") ret.text = getInnerText(topCandidate);
		else ret.html = getCleanedNodeContent(topCandidate, type);
		
		return ret;
	};
	
	return this;
};