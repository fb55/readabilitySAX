/*
	Explenation:
		DOM port of E4XasSAX
		use the document root to initialise it
*/

function saxParser(elem, callbacks){
	if(typeof callbacks !== 'object')
		throw 'please provide callbacks!';

	//todo: support further events, options for trim & space normalisation
	
	function parse(node){
		var name = node.tagName.toLowerCase(),
		    attributeNodes = node.attributes;
		
		callbacks.onopentagname(name);
		
		for(var i = 0, j = attributeNodes.length; i < j; i++){
			callbacks.onattribute(attributeNodes[i].name+'', attributeNodes[i].value);
		}
		
		var childs = node.childNodes,
		    num = childs.length, nodeType;
		
		for(var i = 0; i < num; i++){
			nodeType = childs[i].nodeType;
			if(nodeType === Node.TEXT_NODE)
				callbacks.ontext(childs[i]);
			else if(nodeType === Node.ELEMENT_NODE) parse(childs[i]);
			/*else if(nodeType === Node.COMMENT_NODE)
				if(callbacks.oncomment) callbacks.oncomment(childs[i].toString());
			[...]
			*/
		}
		callbacks.onclosetag(name);
	}
	
	parse(elem);
}