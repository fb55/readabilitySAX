var readability = typeof exports === "undefined" ? {} : exports;

readability.process = function(parser, options){
//list of values
	var tagsToSkip = {textarea:true,head:true,script:true,noscript:true,input:true,select:true,style:true,link:true,aside:true,header:true,nav:true,footer:true},
		tagsToCount = {a:true,audio:true,blockquote:true,div:true,dl:true,embed:true,img:true,input:true,li:true,object:true,ol:true,p:true,pre:true,table:true,ul:true,video:true},
		embeds = {embed:true,object:true,iframe:true}, //iframe added for html5 players
		goodAttributes = {href:true,src:true,title:true,alt:true/*,style:true*/},
		goodTags = {pre:true,td:true,blockquote:true},
		badTags = {address:true,ol:true,ul:true,dl:true,dd:true,dt:true,li:true,form:true},
		worstTags = {h2:true,h3:true,h4:true,h5:true,h6:true,th:true,body:true},
		cleanConditionaly = {form:true,table:true,ul:true,div:true},
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
			
			headers: /h[1-3]/,
			commas : /,[\s\,]{0,}/g,
			notHTMLChars : /[\'\"\<\>]/g
		};
	
	//the tree element
	var Element = function(tagName, attributes){
			this.name = tagName;
			this.attributes = attributes;
			this.children = [];
			this.skip = false;
			this.scores = {
				attribute: 0,
				tag:0,
				total: 0
			};
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
			var ret = ["<" + this.name], i;
			if(settings.stripAttributes){
				for(i in this.attributes)
					if(goodAttributes[i])
						ret.push(i + "=\"" + this.attributes[i] + "\"");
			} else
				for(i in elem.attributes)
					ret.push(i + "=\"" + this.attributes[i] + "\"");
			
			return ret.join(" ") + ">" + this.getInnerHTML() + "</" + this.name + ">";
		},
		getInnerHTML: function(){
			var nodes = this.children, ret = [];
    		for(var i = 0, j = nodes.length; i < j; i++){
    			if(typeof nodes[i] === "string") ret.push(
    				nodes[i] //=> convert special chars
    					.replace(regexps.notHTMLChars, function(a){ return "&#" + a.charCodeAt(0) + ";" })
    				)
    			else ret.push(nodes[i].getOuterHTML());
    		}
    		return ret.join("");
		},
		getText: function(){
			var nodes = this.children, ret = [], text;
			for(var i = 0, j = nodes.length; i < j; i++){
				if(typeof nodes[i] === "string") ret.push(nodes[i]);
				else if(!nodes[i].skip){
					text = nodes[i].getText();
					
					if(text === "") continue;
					
					if(newLinesBefore[ nodes[i].name ]) ret.push("\n");
					
					ret.push(text);
					
					if(newLinesAfter[ nodes[i].name ]) ret.push("\n");
				}
			}
			return ret.join("");
		}
	};
	
	//settings
	var Settings = {
		stripUnlikelyCandidates: true,
		weightClasses: true,
		cleanConditionally: true,
		stripAttributes: true,
		convertLinks: function(a){return a;},
		pageURL: "",
		log : typeof console === "undefined" ? function(){} : console.log
	};
	
	//helper functions
	var mergeNumObjects = function(obj1, obj2){
		for(var i in obj2)
			if(obj1[i])
				obj1[i] += obj2[i];
			else
				obj1[i] = obj2[i];
	};

	//our tree (used instead of the dom)
	var docElements = [new Element("document", {})],
		topCandidate, topParent,
		origTitle, headerTitle,
		settings = Object.create(Settings);
	
	for(var i in options)
		if(options.hasOwnProperty(i))
			settings[i] = options[i];
	
	//skipLevel is a shortcut to allow more elements of the page
	if(options.skipLevel){
		if(options.skipLevel > 0) settings.stripUnlikelyCandidates = false;
		if(options.skipLevel > 1) settings.weightClasses = false;
		if(options.skipLevel > 2) settings.cleanConditionally = false;
	}
	
	if(settings.log === false) settings.log = function(){};
	
	parser.onopentag = function(tag){
		var parent = docElements[docElements.length - 1],
			tagName = tag.name,
			elem = new Element(tagName, tag.attributes);
		
		parent.children.push(elem);
		docElements.push(elem);
		
		if(parent.skip === true){
			elem.skip = true; return;
		}
		
		if(tagsToSkip[tagName]){
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
		else if(goodTags[tagName]) elem.scores.tag += 3;
		else if(badTags[tagName]) elem.scores.tag -= 3;
		else if(worstTags[tagName]) elem.scores.tag -= 5;
		
		//add points for the tags id && classnames
		if(regexps.negative.test(id)) elem.scores.attribute -= 25;
		else if(regexps.positive.test(id)) elem.scores.attribute += 25;
		if(regexps.negative.test(className)) elem.scores.attribute -= 25;
		else if(regexps.positive.test(className)) elem.scores.attribute += 25;
	};
	
	parser.ontext = function(text){ if(text !== "") docElements[docElements.length-1].children.push(text); };
	
	parser.onclosetag = function(tagname){
		var elem = docElements.pop(),
			elemLevel = docElements.length - 1;
		
		if(tagname !== elem.name) settings.log("Tagname didn't match!:" + tagname + " vs. " + elem.name);
		//prepare title
		if(tagname === "title") origTitle = elem.getText();
		else if(tagname === "h1"){
			elem.skip = true;
			if(headerTitle !== false)
				if(!headerTitle) headerTitle = elem.getText();
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
			if (elem.scores.attribute < 0 || elem.info.density > 0.33) elem.skip = true;
		}
		else if(settings.cleanConditionally && cleanConditionaly[tagname]){
			var p = elem.info.tagCount.p || 0,
				contentLength = elem.info.textLength + elem.info.linkLength;
			
			if( elem.info.tagCount.img > p ) elem.skip = true;
			else if( (elem.info.tagCount.li - 100) > p && tagname !== "ul" && tagname !== "ol") elem.skip = true;
			else if(elem.info.tagCount.input > Math.floor(p/3) ) elem.skip = true;
			else if(contentLength < 25 && (!elem.info.tagCount.img || elem.info.tagCount.img > 2) ) elem.skip = true;
			else if(elem.scores.attribute < 25 && elem.info.density > 0.2) elem.skip = true;
			else if(elem.scores.attribute >= 25 && elem.info.density > 0.5) elem.skip = true;
			else if((elem.info.tagCount.embed === 1 && contentLength < 75) || elem.info.tagCount.embed > 1) elem.skip = true;
		}
		
		if(elem.skip) return;
		
		//fix link
		if(elem.attributes.href) elem.attributes.href = settings.convertLinks(elem.attributes.href);
		if(elem.attributes.src)  elem.attributes.src	= settings.convertLinks(elem.attributes.src);
		
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
		
		ret.score = topCandidate.scores.total;
		ret.info = elem.info;
		return ret;
	};
};