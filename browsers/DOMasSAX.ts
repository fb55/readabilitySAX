/*
 *	DOM port of E4XasSAX
 *	Use the document root to initialise it
 */

function saxParser(elem, callbacks) {
    if (typeof callbacks !== "object") throw "please provide callbacks!";

    // TODO: Support additional events, options for trim & space normalisation

    function parse(node) {
        const name = node.tagName.toLowerCase();
        const attributeNodes = node.attributes;

        callbacks.onopentagname(name);

        for (let i = 0; i < attributeNodes.length; i++) {
            callbacks.onattribute(
                `${attributeNodes[i].name}`,
                attributeNodes[i].value
            );
        }

        const childs = node.childNodes;

        for (let i = 0; i < childs.length; i++) {
            const { nodeType } = childs[i];
            if (nodeType === 3 /* Text*/) {
                callbacks.ontext(childs[i].textContent);
            } else if (nodeType === 1 /* Element*/) parse(childs[i]);
            /*
             *Else if(nodeType === 8) //comment
             *if(callbacks.oncomment) callbacks.oncomment(childs[i].toString());
             *[...]
             */
        }
        callbacks.onclosetag(name);
    }

    parse(elem);
}

module.exports = saxParser;
