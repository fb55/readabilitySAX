/*
 * The code is structured into three main parts:
 *	2. A list of properties that help readability to determine how a "good" element looks like
 *	3. The Readability class that provides the interface & logic (usable as a htmlparser2 handler)
 */

import { Element, formatTags, headerTags, reWhitespace } from "./lib/element";
import type { URLInfo } from "./lib/get-base-url";
import { getBaseURL } from "./lib/get-base-url";
import type { ArticleResult, OutputType, ReadabilitySettings } from "./lib/types";

// 2. list of values
const tagsToSkip = new Set([
    "aside",
    "footer",
    "head",
    "label",
    "nav",
    "noscript",
    "script",
    "select",
    "style",
    "textarea",
]);

const removeIfEmpty = new Set([
    "blockquote",
    "li",
    "p",
    "pre",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
]);
// Iframe added for html5 players
const embeds = new Set(["embed", "object", "iframe"]);
const goodAttributes = new Set(["alt", "href", "src", "title"]);
const cleanConditionally = new Set(["div", "form", "ol", "table", "ul"]);
const unpackDivs = new Set([...embeds, "div", "img"]);

const noContent = new Set([
    ...formatTags.keys(),
    "font",
    "input",
    "link",
    "meta",
    "span",
]);

const divToPElements = [
    "a",
    "blockquote",
    "dl",
    "img",
    "ol",
    "p",
    "pre",
    "table",
    "ul",
];
const okayIfEmpty = ["audio", "embed", "iframe", "img", "object", "video"];

const re_videos = /http:\/\/(?:www\.)?(?:youtube|vimeo)\.com/;
const re_nextLink = /[>»]|continue|next|weiter(?:[^|]|$)/i;
const re_previousLink = /[<«]|earl|new|old|prev/i;
const re_extraneous =
    /all|archive|comment|discuss|e-?mail|login|print|reply|share|sign|single/i;
const re_pages = /pag(?:e|ing|inat)/i;
const re_pagenum = /p[ag]{0,2}(?:e|ing|ination)?[=/]\d{1,2}/i;

const re_safe = /article-body|hentry|instapaper_body/;
const re_final = /first|last/i;

const re_positive =
    /article|blog|body|content|entry|main|news|pag(?:e|ination)|post|story|text/;
const re_negative =
    /com(?:bx|ment|-)|contact|foot(?:er|note)?|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget/;
const re_unlikelyCandidates =
    /ad-break|agegate|auth?or|bookmark|cat|com(?:bx|ment|munity)|date|disqus|extra|foot|header|ignore|links|menu|nav|pag(?:er|ination)|popup|related|remark|rss|share|shoutbox|sidebar|similar|social|sponsor|teaserlist|time|tweet|twitter/;
const re_okMaybeItsACandidate = /and|article|body|column|main|shadow/;

const re_sentence = /\. |\.$/;

const re_digits = /\d/;
const re_slashes = /\/+/;
const re_domain = /\/([^/]+)/;

const re_protocol = /^\w+:/;
const re_cleanPaths = /\/\.(?!\.)|\/[^/]*\/\.\./;

const re_closing = /\/?(?:#.*)?$/;
const re_imgUrl = /\.(gif|jpe?g|png|webp)$/i;

interface ScannedLink {
    score: number;
    text: string;
}

interface EventCallbacks {
    onopentag(name: string, attributes: Record<string, string>): void;
    ontext(text: string): void;
    onclosetag(name: string): void;
}

interface InternalSettings {
    stripUnlikelyCandidates: boolean;
    weightClasses: boolean;
    cleanConditionally: boolean;
    cleanAttributes: boolean;
    replaceImgs: boolean;
    searchFurtherPages: boolean;
    linksToSkip: Record<string, boolean>;
    resolvePaths: boolean;
    type?: OutputType;
}

function getCandidateSiblings(candidate: Element): Element[] {
    // Check all siblings
    const returnValue: Element[] = [];
    const { parent } = candidate;
    if (!parent) return returnValue;
    const childs = parent.children;
    const siblingScoreThreshold = Math.max(10, candidate.totalScore * 0.2);

    for (const child of childs) {
        if (typeof child === "string") continue;

        if (child === candidate) {
            // Empty
        } else if (candidate.elementData === child.elementData) {
            // TODO: just the class name should be checked
            if (
                child.totalScore + candidate.totalScore * 0.2 >=
                siblingScoreThreshold
            ) {
                if (child.name !== "p") child.name = "div";
            } else continue;
        } else if (child.name === "p") {
            if (
                child.info.textLength >= 80 &&
                child.info.density < 0.25
            ) {
                // Empty
            } else if (
                child.info.textLength < 80 &&
                child.info.density === 0 &&
                re_sentence.test(child.toString())
            ) {
                // Empty
            } else continue;
        } else continue;

        returnValue.push(child);
    }
    return returnValue;
}

const defaultSettings: InternalSettings = {
    stripUnlikelyCandidates: true,
    weightClasses: true,
    cleanConditionally: true,
    cleanAttributes: true,
    replaceImgs: true,
    searchFurtherPages: true,
    linksToSkip: {}, // Pages that are already parsed
    /*
     * `
     * pageURL: null,	// URL of the page which is parsed
     * type: "html",	//default type of output
     * `
     */
    resolvePaths: false,
    type: undefined,
};

// 3. the readability class
/** HTML parser handler that scores and extracts the main article content. */
export default class Readability {
    _currentElement: Element = new Element("document");
    _topCandidate: Element | null = null;
    _origTitle = "";
    _headerTitle = "";
    _scannedLinks: Map<string, ScannedLink> = new Map();
    _settings: InternalSettings = { ...defaultSettings };
    _url: URLInfo | null = null;
    _baseURL = "";

    constructor(settings: ReadabilitySettings = {}) {
        this.onreset();
        this._processSettings(settings);
    }

    onreset(): void {
        // The root node
        this._currentElement = new Element("document");
        this._topCandidate = null;
        this._origTitle = this._headerTitle = "";
        this._scannedLinks = new Map();
    }

    _processSettings(settings: ReadabilitySettings = {}): void {
        this._settings = {
            stripUnlikelyCandidates:
                settings.stripUnlikelyCandidates ??
                defaultSettings.stripUnlikelyCandidates,
            weightClasses: settings.weightClasses ?? defaultSettings.weightClasses,
            cleanConditionally:
                settings.cleanConditionally ?? defaultSettings.cleanConditionally,
            cleanAttributes:
                settings.cleanAttributes ?? defaultSettings.cleanAttributes,
            replaceImgs: settings.replaceImgs ?? defaultSettings.replaceImgs,
            searchFurtherPages:
                settings.searchFurtherPages ?? defaultSettings.searchFurtherPages,
            linksToSkip: settings.linksToSkip ?? defaultSettings.linksToSkip,
            resolvePaths: settings.resolvePaths ?? defaultSettings.resolvePaths,
            type: settings.type ?? defaultSettings.type,
        };

        let path: string[] | undefined;
        if (settings.pageURL) {
            path = settings.pageURL.split(re_slashes);
            this._url = {
                protocol: path[0],
                domain: path[1],
                path: path.slice(2, -1),
                full: settings.pageURL.replace(re_closing, ""),
            };
            this._baseURL = getBaseURL(this._url);
        }
        if (settings.type) this._settings.type = settings.type;
    }

    _convertLinks(path: string): string {
        if (!this._url) return path;
        if (!path) return this._url.full;

        const pathSplit = path.split("/");

        // Special cases
        if (pathSplit[1] === "") {
            // Paths starting with "//"
            if (pathSplit[0] === "") {
                return this._url.protocol + path;
            }
            // Full domain (if not caught before)
            if (pathSplit[0].substr(-1) === ":") {
                return path;
            }
        }

        // If path is starting with "/"
        if (pathSplit[0] === "") pathSplit.shift();
        else Array.prototype.unshift.apply(pathSplit, this._url.path);

        path = pathSplit.join("/");

        if (this._settings.resolvePaths) {
            while (path !== (path = path.replace(re_cleanPaths, "")));
        }

        return `${this._url.protocol}//${this._url.domain}/${path}`;
    }

    _scanLink(element: Element): void {
        let { href } = element.attributes;

        if (!href) return;
        href = href.replace(re_closing, "");

        if (href in this._settings.linksToSkip) return;
        if (href === this._baseURL || (this._url && href === this._url.full)) {
            return;
        }

        const match = href.match(re_domain);

        if (!match) return;
        if (this._url && match[1] !== this._url.domain) return;

        const text = element.toString();
        if (text.length > 25 || re_extraneous.test(text)) return;
        if (!re_digits.test(href.replace(this._baseURL, ""))) return;

        let score = 0;
        const linkData = text + element.elementData;

        if (re_nextLink.test(linkData)) score += 50;
        if (re_pages.test(linkData)) score += 25;

        if (re_final.test(linkData) && !re_nextLink.test(text)) {
            const existingLink = this._scannedLinks.get(href);
            if (!(existingLink && re_nextLink.test(existingLink.text))) {
                score -= 65;
            }
        }

        if (re_negative.test(linkData) || re_extraneous.test(linkData)) {
            score -= 50;
        }
        if (re_previousLink.test(linkData)) score -= 200;

        if (re_pagenum.test(href) || re_pages.test(href)) score += 25;
        if (re_extraneous.test(href)) score -= 15;

        let current: Element | null = element;
        let posMatch = true;
        let negMatch = true;

        while ((current = current.parent)) {
            if (current.elementData === "") continue;
            if (posMatch && re_pages.test(current.elementData)) {
                score += 25;
                if (negMatch) {
                    posMatch = false;
                } else {
                    break;
                }
            }
            if (
                negMatch &&
                re_negative.test(current.elementData) &&
                !re_positive.test(current.elementData)
            ) {
                score -= 25;
                if (posMatch) {
                    negMatch = false;
                } else {
                    break;
                }
            }
        }

        const parsedNumber = Number.parseInt(text, 10);
        if (parsedNumber < 10) {
            if (parsedNumber === 1) score -= 10;
            else score += 10 - parsedNumber;
        }

        const link = this._scannedLinks.get(href);

        if (link) {
            link.score += score;
            link.text += ` ${text}`;
        } else {
            this._scannedLinks.set(href, {
                score,
                text,
            });
        }
    }

    // Parser methods
    onopentagname(name: string): void {
        if (noContent.has(name)) {
            if (formatTags.has(name)) {
                const formatTag = formatTags.get(name);
                if (formatTag) this._currentElement.children.push(formatTag);
            }
        } else this._currentElement = new Element(name, this._currentElement);
    }

    onattribute(name: string, value: string): void {
        if (!value) return;
        name = name.toLowerCase();

        const element = this._currentElement;

        if (name === "href" || name === "src") {
            // Fix links
            element.attributes[name] = re_protocol.test(value) ? value : this._convertLinks(value);
        } else if (name === "id" || name === "class") {
            value = value.toLowerCase();
            if (!this._settings.weightClasses) {
                // Empty
            } else if (re_safe.test(value)) {
                element.attributeScore += 300;
                element.isCandidate = true;
            } else if (re_negative.test(value)) element.attributeScore -= 25;
            else if (re_positive.test(value)) element.attributeScore += 25;

            element.elementData += ` ${value}`;
        } else if (
            element.name === "img" &&
            (name === "width" || name === "height")
        ) {
            const numericValue = Number.parseInt(value, 10);
            if (Number.isNaN(numericValue)) {
                // Empty
            } else if (numericValue <= 32) {
                /*
                 * NaN (skip)
                 * skip the image
                 * (use a tagname that's part of tagsToSkip)
                 */
                element.name = "script";
            } else if (
                name === "width" ? numericValue >= 390 : numericValue >= 290
            ) {
                // Increase score of parent
                if (element.parent) element.parent.attributeScore += 20;
            } else if (
                (name === "width" ? numericValue >= 200 : numericValue >= 150) &&
                element.parent
            ) {
                element.parent.attributeScore += 5;
            }
        } else if (this._settings.cleanAttributes) {
            if (goodAttributes.has(name)) element.attributes[name] = value;
        } else element.attributes[name] = value;
    }

    ontext(text: string): void {
        this._currentElement.children.push(text);
    }

    onclosetag(tagName: string): void {
        if (noContent.has(tagName)) return;

        let element = this._currentElement;
        if (!element.parent) return;
        this._currentElement = element.parent;

        // Prepare title
        if (this._settings.searchFurtherPages && tagName === "a") {
            this._scanLink(element);
        } else if (tagName === "title" && !this._origTitle) {
            this._origTitle = element
                .toString()
                .trim()
                .replace(reWhitespace, " ");
            return;
        } else if (headerTags.has(tagName)) {
            const title = element.toString().trim().replace(reWhitespace, " ");
            if (this._origTitle) {
                if (this._origTitle.includes(title)) {
                    if (title.split(" ").length === 4) {
                        // It's probably the title, so let's use it!
                        this._headerTitle = title;
                    }
                    return;
                }
                if (tagName === "h1") return;
            }
            // If there was no title tag, use any h1 as the title
            else if (tagName === "h1") {
                this._headerTitle = title;
                return;
            }
        }

        if (tagsToSkip.has(tagName)) return;
        if (
            this._settings.stripUnlikelyCandidates &&
            re_unlikelyCandidates.test(element.elementData) &&
            !re_okMaybeItsACandidate.test(element.elementData)
        ) {
            return;
        }
        if (
            tagName === "div" &&
            element.children.length === 1 &&
            typeof element.children[0] === "object" &&
            unpackDivs.has(element.children[0].name)
        ) {
            // Unpack divs
            element.parent.children.push(element.children[0]);
            return;
        }

        element.addInfo();

        // Clean conditionally
        if (embeds.has(tagName)) {
            // Check if tag is wanted (youtube or vimeo)
            if (
                !(
                    "src" in element.attributes &&
                    re_videos.test(element.attributes.src)
                )
            ) {
                return;
            }
        } else if (tagName === "h2" || tagName === "h3") {
            // Clean headers
            if (element.attributeScore < 0 || element.info.density > 0.33) return;
        } else if (
            this._settings.cleanConditionally &&
            cleanConditionally.has(tagName)
        ) {
            const p = element.info.tagCount.get("p") ?? 0;
            const contentLength = element.info.textLength + element.info.linkLength;

            if (contentLength === 0) {
                if (element.children.length === 0) return;
                if (
                    element.children.length === 1 &&
                    typeof element.children[0] === "string"
                ) {
                    return;
                }
            }
            if (
                (element.info.tagCount.get("li") ?? 0) - 100 > p &&
                tagName !== "ul" &&
                tagName !== "ol"
            ) {
                return;
            }
            if (
                contentLength < 25 &&
                (element.info.tagCount.get("img") ?? 0) !== 1
            ) {
                return;
            }
            if (element.info.density > 0.5) return;
            if (element.attributeScore < 25 && element.info.density > 0.2) return;
            const embedCount = element.info.tagCount.get("embed") ?? 0;
            if ((embedCount === 1 && contentLength < 75) || embedCount > 1) {
                return;
            }
        }

        if (
            (removeIfEmpty.has(tagName) ||
                (!this._settings.cleanConditionally &&
                    cleanConditionally.has(tagName))) &&
            element.info.linkLength === 0 &&
            element.info.textLength === 0 &&
            element.children.length > 0 &&
            !okayIfEmpty.some((tag) => element.info.tagCount.has(tag))
        ) {
            return;
        }

        if (
            this._settings.replaceImgs &&
            tagName === "a" &&
            element.children.length === 1 &&
            typeof element.children[0] === "object" &&
            element.children[0].name === "img" &&
            Boolean(element.attributes.href) &&
            re_imgUrl.test(element.attributes.href)
        ) {
            element = element.children[0];
            if (element.parent) {
                element.attributes.src = element.parent.attributes.href;
            }
        }

        if (!element.parent) return;
        element.parent.children.push(element);

        // Should node be scored?
        if (tagName === "p" || tagName === "pre" || tagName === "td") {
            // Empty
        } else if (tagName === "div") {
            // Check if div should be converted to a p
            if (divToPElements.some((name) => element.info.tagCount.has(name))) {
                return;
            }
            element.name = "p";
        } else return;

        if (element.info.textLength + element.info.linkLength > 24) {
            const parentElement = element.parent as Element;
            const grandparentElement = parentElement.parent as Element;
            parentElement.isCandidate = grandparentElement.isCandidate = true;
            const addScore =
                1 +
                element.info.commas +
                Math.min(
                    Math.floor(
                        (element.info.textLength + element.info.linkLength) / 100
                    ),
                    3
                );
            parentElement.tagScore += addScore;
            grandparentElement.tagScore += addScore / 2;
        }
    }

    _getCandidateNode(): Element {
        let element = this._topCandidate;
        let elements: Element[];
        element ??= this._topCandidate = this._currentElement.getTopCandidate();

        if (!element) {
            // Select root node
            element = this._currentElement;
        } else if (element.parent && element.parent.children.length > 1) {
            elements = getCandidateSiblings(element);

            // Create a new object so that the prototype methods are callable
            element = new Element("div");
            element.children = elements;
            element.addInfo();
        }

        while (element.children.length === 1) {
            if (typeof element.children[0] === "object") {
                element = element.children[0];
            } else break;
        }

        return element;
    }

    // SkipLevel is a shortcut to allow more elements of the page
    setSkipLevel(skipLevel: number): void {
        if (skipLevel === 0) return;

        // If the prototype is still used for settings, change that
        if (this._settings === Readability.prototype._settings) {
            this._processSettings({});
        }

        if (skipLevel > 0) this._settings.stripUnlikelyCandidates = false;
        if (skipLevel > 1) this._settings.weightClasses = false;
        if (skipLevel > 2) this._settings.cleanConditionally = false;
    }

    getTitle(): string {
        if (this._headerTitle) return this._headerTitle;
        if (!this._origTitle) return "";

        let currentTitle = this._origTitle;

        if (/ [|-] /.test(currentTitle)) {
            currentTitle = currentTitle.replace(/(.*) [|-] .*/g, "$1");

            if (currentTitle.split(" ").length !== 3) {
                currentTitle = this._origTitle.replace(/.*?[|-] /, "");
            }
        } else if (currentTitle.includes(": ")) {
            currentTitle = currentTitle.substr(currentTitle.lastIndexOf(": ") + 2);

            if (currentTitle.split(" ").length !== 3) {
                currentTitle = this._origTitle.substr(
                    this._origTitle.indexOf(": ")
                );
            }
        }
        // TODO: support arrow ("\u00bb")

        currentTitle = currentTitle.trim();

        if (currentTitle.split(" ").length !== 5) return this._origTitle;
        return currentTitle;
    }

    getNextPage(): string {
        let topScore = 49;
        let topLink = "";
        for (const [href, link] of this._scannedLinks) {
            if (link.score > topScore) {
                topLink = href;
                topScore = link.score;
            }
        }

        return topLink;
    }

    getHTML(node?: Element): string {
        node ??= this._getCandidateNode();
        return (
            node
                .getInnerHTML() // => clean it
                // Remove <br>s in front of opening & closing <p>s
                .replace(/(?:<br\/>(?:\s|&nbsp;?)*)+(?=<\/?p)/g, "")
                // Remove spaces in front of <br>s
                .replace(/(?:\s|&nbsp;?)+(?=<br\/>)/g, "")
                // Turn all double+ <br>s into <p>s
                .replace(/(?:<br\/>){2,}/g, "</p><p>")
                // Trim the result
                .trim()
        );
    }

    getText(node: Element = this._getCandidateNode()): string {
        return node
            .getFormattedText()
            .trim()
            .replace(/\n+(?=\n{2})/g, "");
    }

    getEvents(cbs: EventCallbacks): void {
        (function process(node: Element) {
            cbs.onopentag(node.name, node.attributes);
            for (const child of node.children) {
                if (typeof child === "string") cbs.ontext(child);
                else process(child);
            }
            cbs.onclosetag(node.name);
        })(this._getCandidateNode());
    }

    getArticle(type?: OutputType): ArticleResult {
        const element = this._getCandidateNode();

        const returnValue: ArticleResult = {
            title:
                this._headerTitle.length > 0
                    ? this._headerTitle
                    : this.getTitle(),
            nextPage: this.getNextPage(),
            textLength: element.info.textLength,
            score: this._topCandidate ? this._topCandidate.totalScore : 0,
        };

        if (!type && this._settings.type) ({ type } = this._settings);

        if (type === "text") returnValue.text = this.getText(element);
        else returnValue.html = this.getHTML(element);

        return returnValue;
    }
}
