/*
	Explenation:
		DOM port of E4XasSAX
		use the document root to initialise it
*/

function saxParser(elem, callbacks){
	if(typeof callbacks !== 'object')
		throw 'please provide callbacks!';
	
	var emptyFunction = function(){},
		onopentag = callbacks.onopentag || emptyFunction,
		onclosetag = callbacks.onclosetag || emptyFunction,
		ontext = callbacks.ontext || emptyFunction,
		onattribute = callbacks.onattribute,
		oncomment = callbacks.oncomment || emptyFunction;
		//todo: support further events, options for trim & space normalisation
	
	function parse(node){
		var elem = {name:node.tagName.toLowerCase(),attributes:{}}, 
		    attributeNodes = node.attributes, 
		    attrNum = attributeNodes.length;
		for(var j = 0; j < attrNum; j++){
		  elem.attributes[attributeNodes[j].name+''] = attributeNodes[j].value;
		}
		onopentag(elem);
		
		if(onattribute)
			for(j in elem.attributes) onattribute({ name: j, value: elem.attributes[j] });
		
		var childs = node.childNodes, num = childs.length, nodeType;
		for(var i = 0; i < num; i++){
			nodeType = childs[i].nodeType;
			if(nodeType === 3 /*text*/) ontext(childs[i].textContent);
    		else if(nodeType === 1 /*element*/) parse(childs[i]);
    		else if(nodeType === 8 /*comment*/) oncomment(childs[i].toString());
    		//[...]
		}
		onclosetag(elem.name);
	}
	
	parse(elem);
}