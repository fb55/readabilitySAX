var readability = typeof exports === "undefined" ? {} : exports;

readability.process = function(parser, settings){
//list of values
	var tagsToSkip = {textarea:true,head:true,script:true,noscript:true,input:true,select:true,style:true,link:true,aside:true,header:true,nav:true,footer:true},
		tagsToCount = {a:true,audio:true,blockquote:true,div:true,dl:true,embed:true,img:true,input:true,li:true,object:true,ol:true,p:true,pre:true,table:true,ul:true,video:true},
		embeds = {embed:true,object:true,iframe:true}, //iframe added for html5 players
		goodAttributes = {href:true,src:true,title:true,alt:true/*,style:true*/},
		goodTags = {pre:true,td:true,blockquote:true},
		badTags = {address:true,ol:true,ul:true,dl:true,dd:true,dt:true,li:true,form:true},
		worstTags = {h2:true,h3:true,h4:true,h5:true,h6:true,th:true,body:true},
		cleanConditionaly = {form:true,table:true,ul:true,ol:true,div:true},
		tagsToScore = {p:true,pre:true,td:true},
		divToPElements = ["a","blockquote","dl","div","img","ol","p","pre","table","ul"],
		newLinesAfter = {br:true,p:true,h2:true,h3:true,h4:true,h5:true,h6:true,li:true},
		newLinesBefore = {p:true,h2:true,h3:true,h4:true,h5:true,h6:true},
		regexps = {
			videos:			 /http:\/\/(www\.)?(vimeo|youtube|yahoo|flickr)\.com/i,
			skipFootnoteLink:/^\s*(\[?[a-z0-9]{1,2}\]?|^|edit|citation needed)\s*$/i,
			nextLink:		 /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
			prevLink:		 /(prev|earl|old|new|<|«)/i,
			extraneous:		 /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single/i,
			
			positive:		/article|body|content|entry|hentry|main|page|pagination|post|text|blog|story/,
			negative:		/combx|comment|com-|contact|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget/,
			unlikelyCandidates:/combx|comment|community|disqus|extra|foot|header|menu|remark|rss|shoutbox|sidebar|sponsor|ad-break|agegate|pagination|pager|popup|tweet|twitter|entry-unrelated/,
			okMaybeItsACandidate:  /and|article|body|column|main|shadow/,
			
			badStart: /\.( |$)/,
			
			pageInURL: /((_|-)?p[a-z]*|(_|-))[0-9]{1,2}$/i,
			noLetters: /[^a-z]/i,
			justDigits: /^\d{1,2}$/,
			
			headers: /h[1-3]/,
			commas : /,[\s\,]{0,}/g,
			notHTMLChars : /[\'\"\<\>]/g
		};
	
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
				childNum = this.children.length,
				elem;
			for(var i=0; i < childNum; i++){
				elem = childs[i];
				if(typeof elem === "string"){
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
					mergeNumObjects(info.tagCount, elem.info.tagCount);
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
				ret += " " + i + "=\"" + this.attributes[i] + "\"";
			
			return ret + ">" + this.getInnerHTML() + "</" + this.name + ">";
		},
		getInnerHTML: function(){
			var nodes = this.children, ret = "",
				replace = function(a){ return "&#" + a.charCodeAt(0) + ";"; }; //=> convert special chars (just the ones converted by sax.js)
			
			for(var i = 0, j = nodes.length; i < j; i++){
				if(typeof nodes[i] === "string") ret += nodes[i].replace(regexps.notHTMLChars, replace);				
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
					
					if(newLinesAfter[ nodes[i].name ]) ret +=  "\n";
				}
			}
			return ret;
		}
	};
	
	//settings
	var Settings = {
		stripUnlikelyCandidates: true,
		weightClasses: true,
		cleanConditionally: true,
		cleanAttributes: true,
		/*
		url: null,			//nodes URL module (or anything that provides its api)
		pageURL: null,		//URL of the page which is parsed
		convertLinks: null, //function to redirect links
		link: null,			//instance of url, may be provided if url was already parsed (pageURL isn't required after that)
		*/
		log : typeof console === "undefined" ? function(){} : console.log
	};
	
	//helper functions
	var mergeNumObjects = function(obj1, obj2){
		for(var i in obj2)
			if(obj1[i])
				obj1[i] += obj2[i];
			else
				obj1[i] = obj2[i];
	}, getBaseURL = function(link){
		var noUrlParams		= link.pathname.split("?")[0],
			urlSlashes		= noUrlParams.split("/").reverse(),
			cleanedSegments = [],
			possibleType	= "",
			i = 0, 
			slashLen = urlSlashes.length;
		
		if(slashLen < 2) return link.protocol + "//" + link.host + noUrlParams; //return what we got
		
		//look if the first to elements get skipped
		var first = urlSlashes[0],
			second= urlSlashes[1];
		
		if((first.length < 3 && first.match(regexps.noLetters)) || first.toLowerCase() === "index" || first.match(regexps.justDigits)){
			if(( second.length < 3 && first.match(regexps.noLetters) ) || second.match(regexps.justDigits)) i = 2;
			else i = 1;
		}
		else{
			if(first.match(regexps.pageInURL))
			  	urlSlashes[0] = first.replace(regexps.pageInURL, "");
			
			//if only the second one gets skiped, start at an index of 1 and position the first element there
			if( (second.length < 3 && first.match(regexps.noLetters)) || second.match(regexps.justDigits))
				urlSlashes[ i = 1 ] = first;
			
			else if(second.match(regexps.pageInURL))
				urlSlashes[1] = second.replace(regexps.pageInURL, "");
		}
		
		var dotSplit, segment;
		
		for(;i < slashLen; i++){
			// Split off and save anything that looks like a file type.
			dotSplit = urlSlashes[i].split(".");
			
			//change from readability: ensure that segments with multiple points get skipped
			if (dotSplit.length === 2 && !dotSplit[1].match(regexps.noLetters))
				segment = dotSplit[0];
			else segment = urlSlashes[i];
			
			if(segment.indexOf(',00') !== -1)
				segment = segment.replace(",00", "");
			
			cleanedSegments.push(segment);
		}

		// This is our final, cleaned, base article URL.
		return link.protocol + "//" + link.host + cleanedSegments.reverse().join("/");
	};

	//our tree (used instead of the dom)
	var docElements = [new Element("document", {})],
		topCandidate, topParent,
		origTitle, headerTitle;
	
	
	//process settings
	for(var i in Settings)
		if(typeof settings[i] === "undefined")
			settings[i] = Settings[i];
	
	//skipLevel is a shortcut to allow more elements of the page
	if(settings.skipLevel){
		if(settings.skipLevel > 0) settings.stripUnlikelyCandidates = false;
		if(settings.skipLevel > 1) settings.weightClasses = false;
		if(settings.skipLevel > 2) settings.cleanConditionally = false;
	}
	
	if(settings.log === false) settings.log = function(){};
	
	if(!settings.link && settings.url && settings.pageURL)
		settings.link = settings.url.parse( settings.pageURL );
	
	if(!settings.convertLinks) 
		if(settings.link)
			settings.convertLinks = settings.url.resolve.bind(null, settings.link);
		else settings.convertLinks = function(a){ return a; };
	
	var baseURL;
	if(settings.link)
		baseURL = getBaseURL(settings.link);
	else baseURL = "";
	
	parser.onopentag = function(tag){
		var parent = docElements[docElements.length - 1],
			tagName = tag.name,
			elem = new Element(tagName);
		
		docElements.push(elem);
		
		if(parent.skip === true){
			elem.skip = true; return;
		}
		
		if(tagsToSkip[tagName]){
			elem.skip = true; return;
		}
		
		if(settings.stripUnlikelyCandidates){
			var matchString = ((tag.attributes.id || "") + (tag.attributes["class"] || "")).toLowerCase();
			if(regexps.unlikelyCandidates.test(matchString) && 
				!regexps.okMaybeItsACandidate.test(matchString)){
					elem.skip = true; return;
			}
		}
		
		//do this now, so gc can remove it after onclosetag
		parent.children.push(elem);
		
		//add points for the tags name
		if(tagName === "article") elem.tagScore += 30;
		else if(tagName === "div") elem.tagScore += 5;
		else if(goodTags[tagName]) elem.tagScore += 3;
		else if(badTags[tagName]) elem.tagScore -= 3;
		else if(worstTags[tagName]) elem.tagScore -= 5;
	};
	
	parser.onattribute = function(attr){
		var elem = docElements[docElements.length-1],
			name = attr.name,
			value = attr.value;
		
		if(elem.skip) return;
		
		if(name === "id" || name === "class"){
			if(regexps.negative.test(value)) elem.attributeScore -= 25;
			else if(regexps.positive.test(value)) elem.attributeScore += 25;
		}
		else if(name === "href" || name === "src"){
			//fix links
			elem.attributes[name] = settings.convertLinks(value);
		}
		else if(settings.cleanAttributes){
			if(goodAttributes[name])
				elem.attributes[name] = value;
		}
		else elem.attributes[name] = value;
	};
	
	parser.ontext = function(text){ docElements[docElements.length-1].children.push(text); };
	
	parser.onclosetag = function(tagname){
		var elem = docElements.pop(),
			elemLevel = docElements.length - 1;
		
		//if(tagname !== elem.name) settings.log("Tagname didn't match!:" + tagname + " vs. " + elem.name);
		
		//prepare title
		if(tagname === "title") origTitle = elem.getText();
		else if(tagname === "h1"){
			elem.skip = true;
			if(headerTitle !== false)
				if(!headerTitle) headerTitle = elem.getText();
				else headerTitle = false;
		}
		
		if(elem.skip) return;
		
		elem.addInfo();
		
		var i, j, cnvrt;
		//clean conditionally
		if(tagname === "p"){
			if(!elem.info.tagCount.img && !elem.info.tagCount.embed && !elem.info.tagCount.object && elem.info.linkLength === 0 && elem.info.textLength === 0)
				elem.skip = true;
		}
		else if(embeds[tagname]){
			//check if tag is wanted (youtube or vimeo)
			cnvrt = true;
			for(i in elem.attributes)
				if(elem.hasOwnProperty(i))
					if(regexps.videos.test(i)){ cnvrt = false; break; }
			
			if(cnvrt) elem.skip = true;
		}
		else if(regexps.headers.test(tagname)){
			//clean headers
			if (elem.attributeScore < 0 || elem.info.density > 0.33) elem.skip = true;
		}
		else if(settings.cleanConditionally && cleanConditionaly[tagname]){
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
				docElements[elemLevel].isCandidate = docElements[elemLevel-1].isCandidate = true;
				var addScore = 1 + elem.info.commas + Math.min( Math.floor( (elem.info.textLength + elem.info.linkLength) / 100 ), 3);
				docElements[elemLevel].tagScore	+= addScore;
				docElements[elemLevel-1].tagScore	+= addScore / 2;
			}
		}
		
		if(elem.isCandidate){
			elem.totalScore = Math.floor((elem.tagScore + elem.attributeScore) * (1 - elem.info.density));
			if(!topCandidate || elem.totalScore > topCandidate.totalScore){
				topCandidate = elem;
				if(elemLevel >= 0)
					topParent = docElements[elemLevel];
				else
					topParent = null;
			}
		}
	};
	
	var getCandidateSiblings = function(){
		if(!topCandidate){
			try{
				topCandidate = docElements[0].children.pop().children.pop(); //body
			}
			catch(e){
				topCandidate = new Element("",{});
			}
			topCandidate.name = "div";
		}
		//check all siblings
		if(!topParent)
			return [topCandidate];
		
		var ret = [],
			childs = topParent.children,
			childNum = childs.length,
			siblingScoreThreshold = Math.max(10, topCandidate.totalScore * 0.2);
		
		for(var i = 0; i < childNum; i++){
			if(typeof childs[i] === "string") continue;
			var append = false;
			if(childs[i] === topCandidate) append = true;
			else{
				var contentBonus = 0;
				if(topCandidate.attributes["class"] && topCandidate.attributes["class"] === childs[i].attributes["class"]) 
					contentBonus += topCandidate.totalScore * 0.2;
				if((childs[i].totalScore + contentBonus) >= siblingScoreThreshold) append = true;
				else if(childs[i].name === "p")
					if(childs[i].info.textLength > 80 && childs[i].info.density < 0.25) append = true;
					else if(childs[i].info.textLength < 80 && childs[i].info.density === 0 && childs[i].getText().search(regexps.badStart) !== -1)
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
	this.getTitle = function(){
		var curTitle = origTitle || "";
		
		if(curTitle.match(/ [\|\-] /)){
			curTitle = origTitle.replace(/(.*)[\|\-] .*/gi,'$1');
			
			if(curTitle.split(' ', 3).length < 3)
				curTitle = origTitle.replace(/[^\|\-]*[\|\-](.*)/gi,'$1');
		}
		else if(curTitle.indexOf(': ') !== -1){
			curTitle = origTitle.replace(/.*:(.*)/gi, '$1');

			if(curTitle.split(' ', 3).length < 3)
				curTitle = origTitle.replace(/[^:]*[:](.*)/gi,'$1');
		}
		else if(curTitle.length > 150 || curTitle.length < 15)
			if(headerTitle)
				curTitle = headerTitle;

		curTitle = curTitle.trim();

		if(curTitle.split(' ', 5).length < 5)
			curTitle = origTitle;
		
		return curTitle;
	};
	this.getArticle = function(type){
		var ret = {
			title: this.getTitle(),
			nextPage: "" //TODO
		};
		if(type === "node") ret.node = topCandidate;
		
		//create a new object so that the prototype methods are callable
		var elem = new Element("", {});
		elem.children = getCandidateSiblings();
		elem.addInfo();
		
		ret.textLength = elem.info.textLength;
		
		if(type === "text")
			ret.text = elem.getText().trim();
		
		else ret.html = elem.getInnerHTML() //=> clean it
			//kill breaks
			.replace(/(<\/?br\s*\/?>(\s|&nbsp;?)*)+/g,'<br/>')
			//turn all double brs into ps
			.replace(/(<br[^>]*>[ \n\r\t]*){2,}/g, '</p><p>')
			//remove font tags
			.replace(/<(\/?)font[^>]*>/g, '<$1span>')
			//remove breaks in front of paragraphs
			.replace(/<br[^>]*>\s*<p/g,"<p");
		
		ret.score = topCandidate.totalScore;
		return ret;
	};
	
	return this;
};