const reCommas = /,[\s,]*/g;
/** Matches runs of whitespace in text nodes. */
export const reWhitespace = /\s+/g;

/** Header tags considered for title extraction. */
export const headerTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const newLinesAfter = new Set([...headerTags, "br", "li", "p"]);
const selfClosingTagNames = new Set(["br", "hr"]);

const tagScores = new Map<string, number>([
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

type ChildNode = Element | string;

interface ElementInfo {
    textLength: number;
    linkLength: number;
    commas: number;
    density: number;
    tagCount: Map<string, number>;
}

/**
 * Minimal tree node used by readability during parsing.
 */
export class Element {
    name: string;
    parent: Element | null = null;
    attributes: Record<string, string> = {};
    children: ChildNode[] = [];
    tagScore = 0;
    attributeScore = 0;
    totalScore = 0;
    elementData = "";
    info: ElementInfo = {
        textLength: 0,
        linkLength: 0,
        commas: 0,
        density: 0,
        tagCount: new Map<string, number>(),
    };
    isCandidate = false;

    constructor(tagName: string, parent?: Element) {
        this.name = tagName;
        this.parent = parent ?? null;
    }

    addInfo() {
        const { info } = this;
        for (const child of this.children) {
            if (typeof child === "string") {
                info.textLength += child.trim().length;
                if (reCommas.test(child)) {
                    info.commas += child.split(reCommas).length - 1;
                }
                continue;
            }

            if (child.name === "a") {
                info.linkLength += child.info.textLength + child.info.linkLength;
            } else {
                info.textLength += child.info.textLength;
                info.linkLength += child.info.linkLength;
            }

            info.commas += child.info.commas;

            for (const [tag, count] of child.info.tagCount) {
                const tagCount = info.tagCount.get(tag) ?? 0;
                info.tagCount.set(tag, tagCount + count);
            }

            const currentTagCount = info.tagCount.get(child.name) ?? 0;
            info.tagCount.set(child.name, currentTagCount + 1);
        }

        if (info.linkLength > 0) {
            info.density = info.linkLength / (info.textLength + info.linkLength);
        }
    }

    getOuterHTML(): string {
        let output = `<${this.name}`;

        for (const name in this.attributes) {
            output += ` ${name}="${this.attributes[name]}"`;
        }

        if (this.children.length === 0) {
            if (selfClosingTagNames.has(this.name)) return `${output}/>`;
            return `${output}></${this.name}>`;
        }

        return `${output}>${this.getInnerHTML()}</${this.name}>`;
    }

    getInnerHTML(): string {
        return this.children
            .map((child) =>
                typeof child === "string" ? child : child.getOuterHTML()
            )
            .join("");
    }

    getFormattedText(): string {
        return this.children
            .map((child) =>
                typeof child === "string"
                    ? child.replace(reWhitespace, " ")
                    : child.getFormattedText() +
                      (newLinesAfter.has(child.name) ? "\n" : "")
            )
            .join("");
    }

    toString(): string {
        return this.children.join("");
    }

    getTopCandidate(): Element | null {
        let topScore = Number.NEGATIVE_INFINITY;
        let topCandidate: Element | null = null;

        for (const child of this.children) {
            if (typeof child === "string") continue;

            if (child.isCandidate) {
                // Add points for the tag name.
                child.tagScore += tagScores.get(child.name) ?? 0;
                const score = Math.floor(
                    (child.tagScore + child.attributeScore) *
                        (1 - child.info.density)
                );

                if (topScore < score) {
                    child.totalScore = score;
                    topScore = score;
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

/** Formatting tags that should render as self-closing nodes. */
export const formatTags = new Map<string, Element>([
    ["br", new Element("br")],
    ["hr", new Element("hr")],
]);
