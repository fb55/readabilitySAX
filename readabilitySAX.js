var readability = typeof exports === "undefined" ? {} : exports;

readability.process = function(parser, options){
	//our tree (used instead of the dom)
	var docElements = [{name:"document", attributes: [], children: []}],
		elemLevel = 0,
		topCandidate, topParent,
		origTitle, headerTitle;
	
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
	mergeObjects = function(obj1, obj2){
		for(var i in obj2)
			if(obj2.hasOwnProperty(i))
				if(typeof obj1[i] === "number")
					obj1[i] += obj2[i];
				else
					obj1[i] = obj2[i];
		return obj1;
	},
	addInfo = function(node){
		var info = node.info,
			childs = node.children,
			childNum = childs.length;
		for(var i=0, elem; i < childNum; i++){
			elem = childs[i];
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
				mergeObjects(info.tagCount, elem.info.tagCount);
				if(info.tagCount[elem.name]) info.tagCount[elem.name] += 1;
				else info.tagCount[elem.name] = 1;
			}
		}
		info.density = info.linkLength / (info.textLength + info.linkLength);
		if(isNaN(info.density))
			info.density = 1; //just ensure it gets skipped
		node.info = info;
		return info;
	},
	getInnerHTML = function(nodes){
		var ret = "";
		for(var i = 0, j = nodes.length; i < j; i++){
			if(typeof nodes[i] === "string") ret += " " + nodes[i];
			else ret += " " + getOuterHTML(nodes[i]);
		}
		return ret;
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
		
		ret += ">" + getInnerHTML(elem.children);
		
		return ret + "</" + elem.name + ">";
	},
	getInnerText = function(elem){
		return getText(elem.children);
	},
	getText = function(nodes){
		var ret = "";
		for(var i = 0, j = nodes.length; i < j; i++){
			if(typeof nodes[i] === "string") ret += " " + nodes[i];
			else if(!nodes[i].skip) ret += getText(nodes[i].children);
		}
		return ret;
	};
	
	//settings
	var settings = {
		stripUnlikelyCandidates: true,
		weightClasses: true,
		cleanConditionally: true,
		stripAttributes: true,
		convertLinks: function(a){return a;},
		pageURL: "",
		log : true
	};
	settings = mergeObjects(settings, options);
	
	//skipLevel is a shortcut to allow more elements of the page
	if(options.skipLevel){
		if(skipLevel > 0) stripUnlikelyCandidates = false;
		if(skipLevel > 1) weightClasses = false;
		if(skipLevel > 2) cleanConditionally = false;
	}
	
	var log = (function(){
		if(!settings.log) return function(){};
		/*global console, y*/
		if(typeof settings.log === "function") return settings.log;
		else if(typeof console !== "undefined") return console.log;
		//else if(window && window.alert) window.alert(msg);
	})();
	
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
			negative:		/combx|comment|com-|contact|foot|footer|footnote|tabs|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget/,
			unlikelyCandidates:/combx|comment|community|disqus|extra|foot|header|menu|remark|rss|shoutbox|sidebar|sponsor|ad-break|agegate|pagination|pager|popup|tweet|twitter/,
			okMaybeItsACandidate:  /and|article|body|column|main|shadow/,
			
			badStart: /\.( |$)/,
			
			headers: /h[1-3]/,
			commas : /,[\s\,]{0,}/g
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
		
		var matchString = id + className;
		if(regexps.unlikelyCandidates.test(matchString) && 
			!regexps.okMaybeItsACandidate.test(matchString)){
				elem.skip = true; return;
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
			if(headerTitle !== false)
				if(!headerTitle) headerTitle = getInnerText(elem);
				else headerTitle = false;
		}
		
		if(elem.skip) return;
		
		elem.info = addInfo(elem);
		
		var i, j, cnvrt;
		//clean conditionally
		if(tagname === "p")
			if(!elem.info.tagCount.img && !elem.info.tagCount.embed && !elem.info.tagCount.object && elem.info.linkLength === 0 && elem.info.textLength === 0)
				elem.skip = true;
		else if(tagname === "embed" || tagname === "object" || tagname === "iframe"){ //iframe added for html5 players
			//check if tag is wanted (youtube or vimeo)
			cnvrt = true;
			for(i in elem.attributes)
				if(elem.hasOwnProperty(i))
					if(regexps.videos.test(i)) cnvrt = false;
			
			if(cnvrt) elem.skip = true;
		}
		else if(regexps.headers.test(tagname))
			//clean headers
			if (elem.scores.attribute < 0 || elem.info.density > 0.33) elem.skip = true;
		
		else if(settings.cleanConditionally && isPartOfArray(cleanConditionaly, tagname)){
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
				docElements[elemLevel].scores.tag	+= addScore;
				docElements[elemLevel-1].scores.tag	+= addScore / 2;
			}
		}
		
		if(elem.isCandidate){
			elem.scores.total = Math.floor((elem.scores.tag + elem.scores.attribute) * (1 - elem.info.density));
			if(!topCandidate || elem.scores.total > topCandidate.scores.total){
				topCandidate = elem;
				if(elemLevel >= 0)
					topParent = docElements[elemLevel];
				else
					topParent = null;
			}
		}
	};
	
	var getCleanedContent = function(html){
		return html
			//remove whitespace
			.trim().replace(/\s+/g," ")
			//kill breaks
			.replace(/(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,'<br/>')
			//turn all double brs into ps
			.replace(/(<br[^>]*>[ \n\r\t]*){2,}/g, '</p><p>')
			//remove font tags
			.replace(/<(\/?)font[^>]*>/g, '<$1span>')
			//remove breaks in front of paragraphs
			.replace(/<br[^>]*>\s*<p/g,"<p");
	},
	getCandidateSiblings = function(){
		if(!topCandidate){
			topCandidate = docElements[2]; //body
			topCandidate.name = "div";
		}	
		//check all siblings
		if(!topParent)
			return [topCandidate];
		
		var ret = [],
			childs = topParent.children,
			childNum = childs.length,
			siblingScoreThreshold = Math.max(10, topCandidate.scores.total * 0.2);
		
		for(var i = 0; i < childNum; i++){
			if(typeof childs[i] === "string") continue;
			var append = false;
			if(childs[i] === topCandidate) append = true;
			else{
				var contentBonus = 0;
				if(topCandidate.attributes["class"] && topCandidate.attributes["class"] === childs[i].attributes["class"]) 
					contentBonus += topCandidate.scores.total * 0.2;
				if((childs[i].scores.total + contentBonus) >= siblingScoreThreshold) append = true;
				else if(childs[i].name === "p")
					if(childs[i].info.textLength > 80 && childs[i].info.density < 0.25) append = true;
					else if(childs[i].info.textLength < 80 && childs[i].info.density === 0 && getInnerText(childs[i]).search(regexps.badStart) !== -1)
						append = true;
			}
			if(append){
				if(childs[i].name !== "div" || childs[i].name !== "p")
					childs[i].name = "div";
				
				ret.push(childs[i]);
			}
		}
		return ret;
	}
	this.getTitle = function(){
		var curTitle = origTitle;
		
		if(curTitle.match(/ [\|\-] /)){
            curTitle = origTitle.replace(/(.*)[\|\-] .*/gi,'$1');
            
            if(curTitle.split(' ').length < 3)
                curTitle = origTitle.replace(/[^\|\-]*[\|\-](.*)/gi,'$1');
        }
        else if(curTitle.indexOf(': ') !== -1){
            curTitle = origTitle.replace(/.*:(.*)/gi, '$1');

            if(curTitle.split(' ').length < 3)
                curTitle = origTitle.replace(/[^:]*[:](.*)/gi,'$1');
        }
        else if(curTitle.length > 150 || curTitle.length < 15)
            if(headerTitle)
            	curTitle = headerTitle;

        curTitle = curTitle.trim();

        if(curTitle.split(' ').length <= 4)
            curTitle = origTitle;
		
		return curTitle;
	};
	this.getArticle = function(type){
		var ret = {
			title: this.getTitle(),
			nextPage: "" //TODO
		};
		if(type === "node") ret.node = topCandidate;
		else if(type === "text") ret.text = getInnerText(topCandidate);
		else{
			var nodes = getCandidateSiblings();
			ret.textLength = 0;
			for(var i = 0, j = nodes.length; i < j; i++)
				ret.textLength += nodes[i].info.textLength;
			ret.html = getCleanedContent(getInnerHTML(nodes));
		}
		ret.score = topCandidate.scores.total;
		return ret;
	};
	
	return this;
};