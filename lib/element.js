const re_commas = /,[\s,]*/g;
const re_whitespace = /\s+/g;

const headerTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const newLinesAfter = new Set([...headerTags, "br", "li", "p"]);

const tagScores = new Map([
    ["address", -3],
    ["article", 30],
    ["blockquote", 3],
    ["body", -5],
    ["dd", -3],
    ["div", 5],
    ["dl", -3],
    ["dt", -3],
    ["form", -3],
    ["h2", -5],
    ["h3", -5],
    ["h4", -5],
    ["h5", -5],
    ["h6", -5],
    ["li", -3],
    ["ol", -3],
    ["pre", 3],
    ["section", 15],
    ["td", 3],
    ["th", -5],
    ["ul", -3],
]);

/**
 * `Element` is a light-weight class that is used
 * instead of the DOM (and provides some DOM-like functionality)
 */
class Element {
    constructor(tagName, parent) {
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
            commas: 0,
            density: 0,
            tagCount: new Map(),
        };
        this.isCandidate = false;
    }

    addInfo() {
        const { info } = this;
        const childs = this.children;
        let elem;
        for (let i = 0; i < childs.length; i++) {
            elem = childs[i];
            if (typeof elem === "string") {
                info.textLength +=
                    elem.trim()./* `replace(re_whitespace, " ").` */ length;
                if (re_commas.test(elem)) {
                    info.commas += elem.split(re_commas).length - 1;
                }
            } else {
                if (elem.name === "a") {
                    info.linkLength +=
                        elem.info.textLength + elem.info.linkLength;
                } else {
                    info.textLength += elem.info.textLength;
                    info.linkLength += elem.info.linkLength;
                }
                info.commas += elem.info.commas;

                for (const [tag, count] of elem.info.tagCount) {
                    const infoCount = info.tagCount.get(tag) || 0;
                    info.tagCount.set(tag, infoCount + count);
                }

                const infoCount = info.tagCount.get(elem.name) || 0;
                info.tagCount.set(elem.name, infoCount + 1);
            }
        }

        if (info.linkLength !== 0) {
            info.density =
                info.linkLength / (info.textLength + info.linkLength);
        }
    }

    getOuterHTML() {
        let ret = `<${this.name}`;

        for (const i in this.attributes) {
            ret += ` ${i}="${this.attributes[i]}"`;
        }

        if (this.children.length === 0) {
            if (this.name in formatTags) return `${ret}/>`;
            return `${ret}></${this.name}>`;
        }

        return `${ret}>${this.getInnerHTML()}</${this.name}>`;
    }

    getInnerHTML() {
        return this.children
            .map((child) =>
                typeof child === "string" ? child : child.getOuterHTML()
            )
            .join("");
    }

    getFormattedText() {
        return this.children
            .map((child) =>
                typeof child === "string"
                    ? child.replace(re_whitespace, " ")
                    : child.getFormattedText() +
                      (newLinesAfter.has(child.name) ? "\n" : "")
            )
            .join("");
    }

    toString() {
        return this.children.join("");
    }

    getTopCandidate() {
        let topScore = -Infinity;
        let score = 0;
        let topCandidate = null;

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];

            if (typeof child === "string") continue;
            if (child.isCandidate) {
                // Add points for the tags name
                child.tagScore += tagScores.get(child.name) || 0;

                score = Math.floor(
                    (child.tagScore + child.attributeScore) *
                        (1 - child.info.density)
                );
                if (topScore < score) {
                    child.totalScore = topScore = score;
                    topCandidate = child;
                }
            }

            const childCandidate = child.getTopCandidate();
            if (childCandidate && topScore < childCandidate.totalScore) {
                topScore = childCandidate.totalScore;
                topCandidate = childCandidate;
            }
        }

        return topCandidate;
    }
}

const formatTags = {
    __proto__: null,
    br: new Element("br"),
    hr: new Element("hr"),
};

module.exports = {
    Element,
    headerTags,
    formatTags,
    re_whitespace,
};
