/*
	Explenation:
		Just a quick port of E4XasSAX.js
*/

function saxParser(node, callbacks){
	if(typeof callbacks !== 'object')
		throw 'plase provide callbacks!';
		
	function parse(node){
		if(callbacks.onopentag){
			var elem = {name:node.tagName.toLowerCase(),attributes:{}}, 
				attributeNodes = node.attributes, 
				attrNum = attributeNodes.length;
			for(var j = 0; j < attrNum; j++){
			  elem.attributes[attributeNodes[j].name+''] = attributeNodes[j].value+'';
			}
			callbacks.onopentag(elem);
		}
		var childs = node.childNodes, num = childs.length;
		for(var i = 0; i < num; i++){
			if(childs[i] === undefined) return;
			if(childs[i].nodeType === 3){
				//textnode
				if(callbacks.ontext) //todo: options for trim & spaces
					callbacks.ontext(childs[i].textContent.replace(/\s+/g,' ').trim());
			}
			else //node
				parse(childs[i]);
		}
		if(callbacks.onclosetag) callbacks.onclosetag(node.tagName.toLowerCase());
	}
	
	parse(node);
}