/*
 *	DOM port of E4XasSAX
 *	Use the document root to initialise it
 */

interface SAXCallbacks {
    onopentagname(name: string): void;
    onattribute(name: string, value: string): void;
    ontext(text: string): void;
    onclosetag(name: string): void;
}

export default function saxParser(elem: Element, callbacks: SAXCallbacks): void {
    // TODO: Support additional events, options for trim & space normalisation

    function parse(node: Element): void {
        const name = node.tagName.toLowerCase();
        const attributeNodes = node.attributes;

        callbacks.onopentagname(name);

        for (let i = 0; i < attributeNodes.length; i++) {
            callbacks.onattribute(
                `${attributeNodes[i].name}`,
                attributeNodes[i].value,
            );
        }

        const childs = node.childNodes;

        for (let i = 0; i < childs.length; i++) {
            const { nodeType } = childs[i];
            if (nodeType === 3 /* Text */) {
                callbacks.ontext(childs[i].textContent ?? "");
            } else if (nodeType === 1 /* Element */)
                parse(childs[i] as Element);
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
