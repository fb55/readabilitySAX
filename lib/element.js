module.exports = Element;

/*
* A light-weight "Element" class, which is used as the DOM
*/

var formatTags = {__proto__:null,br:new Element("br"),hr:new Element("hr")},
    headerTags = {__proto__:null,h1:true,h2:true,h3:true,h4:true,h5:true,h6:true},
    newLinesAfter = {__proto__:headerTags,br:true,li:true,p:true},

    tagCounts = {__proto__:null,address:-3,article:30,blockquote:3,body:-5,dd:-3,div:5,dl:-3,dt:-3,form:-3,h2:-5,h3:-5,h4:-5,h5:-5,h6:-5,li:-3,ol:-3,pre:3,section:15,td:3,th:-5,ul:-3},

    re_whitespace = /\s+/g,
    re_commas = /,[\s\,]*/g;

function Element(tagName, parent){
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
}

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

		if(info.linkLength !== 0){
			info.density = info.linkLength / (info.textLength + info.linkLength);
		}
	},
	getOuterHTML: function(){
		var ret = "<" + this.name;

		for(var i in this.attributes){
			ret += " " + i + "=\"" + this.attributes[i] + "\"";
		}

		if(this.children.length === 0){
			if(this.name in formatTags) return ret + "/>";
			else return ret + "></" + this.name + ">";
		}

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
				if(nodes[i].name in newLinesAfter) ret += "\n";
			}
		}
		return ret;
	},
	toString: function(){
		return this.children.join("");
	},
	getTopCandidate: function(){
		var childs = this.children,
		    topScore = -Infinity,
		    score = 0,
		    topCandidate, elem;

		for(var i = 0, j = childs.length; i < j; i++){
			if(typeof childs[i] === "string") continue;
			if(childs[i].isCandidate){
				elem = childs[i];
				//add points for the tags name
				if(elem.name in tagCounts) elem.tagScore += tagCounts[elem.name];

				score = Math.floor(
					(elem.tagScore + elem.attributeScore) * (1 - elem.info.density)
				);
				if(topScore < score){
					elem.totalScore = topScore = score;
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