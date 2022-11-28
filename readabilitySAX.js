/*
 * The code is structured into three main parts:
 *	2. A list of properties that help readability to determine how a "good" element looks like
 *	3. The Readability class that provides the interface & logic (usable as a htmlparser2 handler)
 */

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
            tagCount: {},
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

                for (const j in elem.info.tagCount) {
                    if (j in info.tagCount) {
                        info.tagCount[j] += elem.info.tagCount[j];
                    } else info.tagCount[j] = elem.info.tagCount[j];
                }

                if (elem.name in info.tagCount) info.tagCount[elem.name] += 1;
                else info.tagCount[elem.name] = 1;
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
        const childs = this.children;
        let topScore = -Infinity;
        let score = 0;
        let topCandidate;
        let elem;

        for (let i = 0; i < childs.length; i++) {
            if (typeof childs[i] === "string") continue;
            if (childs[i].isCandidate) {
                elem = childs[i];
                // Add points for the tags name
                if (elem.name in tagScores) {
                    elem.tagScore += tagScores[elem.name];
                }

                score = Math.floor(
                    (elem.tagScore + elem.attributeScore) *
                        (1 - elem.info.density)
                );
                if (topScore < score) {
                    elem.totalScore = topScore = score;
                    topCandidate = elem;
                }
            }
            if (
                (elem = childs[i].getTopCandidate()) &&
                topScore < elem.totalScore
            ) {
                topScore = elem.totalScore;
                topCandidate = elem;
            }
        }
        return topCandidate;
    }
}

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
const tagScores = {
    __proto__: null,
    address: -3,
    article: 30,
    blockquote: 3,
    body: -5,
    dd: -3,
    div: 5,
    dl: -3,
    dt: -3,
    form: -3,
    h2: -5,
    h3: -5,
    h4: -5,
    h5: -5,
    h6: -5,
    li: -3,
    ol: -3,
    pre: 3,
    section: 15,
    td: 3,
    th: -5,
    ul: -3,
};
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
const formatTags = {
    __proto__: null,
    br: new Element("br"),
    hr: new Element("hr"),
};
const noContent = {
    __proto__: formatTags,
    font: false,
    input: false,
    link: false,
    meta: false,
    span: false,
};
const headerTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const newLinesAfter = new Set([...headerTags, "br", "li", "p"]);

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
const re_prevLink = /[<«]|earl|new|old|prev/i;
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
const re_whitespace = /\s+/g;

const re_pageInURL = /[_-]?p[a-zA-Z]*[_-]?\d{1,2}$/;
const re_badFirst = /^(?:[^a-z]{0,3}|index|\d+)$/i;
const re_noLetters = /[^a-zA-Z]/;
const re_params = /\?.*/;
const re_extension = /00,|\.[a-zA-Z]+$/g;
const re_digits = /\d/;
const re_justDigits = /^\d{1,2}$/;
const re_slashes = /\/+/;
const re_domain = /\/([^/]+)/;

const re_protocol = /^\w+:/;
const re_cleanPaths = /\/\.(?!\.)|\/[^/]*\/\.\./;

const re_closing = /\/?(?:#.*)?$/;
const re_imgUrl = /\.(gif|jpe?g|png|webp)$/i;

const re_commas = /,[\s,]*/g;

function getCandidateSiblings(candidate) {
    // Check all siblings
    const ret = [];
    const childs = candidate.parent.children;
    const siblingScoreThreshold = Math.max(10, candidate.totalScore * 0.2);

    for (let i = 0; i < childs.length; i++) {
        if (typeof childs[i] === "string") continue;

        if (childs[i] === candidate);
        else if (candidate.elementData === childs[i].elementData) {
            // TODO: just the class name should be checked
            if (
                childs[i].totalScore + candidate.totalScore * 0.2 >=
                siblingScoreThreshold
            ) {
                if (childs[i].name !== "p") childs[i].name = "div";
            } else continue;
        } else if (childs[i].name === "p") {
            if (
                childs[i].info.textLength >= 80 &&
                childs[i].info.density < 0.25
            );
            else if (
                childs[i].info.textLength < 80 &&
                childs[i].info.density === 0 &&
                re_sentence.test(childs[i].toString())
            );
            else continue;
        } else continue;

        ret.push(childs[i]);
    }
    return ret;
}

const defaultSettings = {
    stripUnlikelyCandidates: true,
    weightClasses: true,
    cleanConditionally: true,
    cleanAttributes: true,
    replaceImgs: true,
    searchFurtherPages: true,
    linksToSkip: {}, // Pages that are already parsed
    /*
     * PageURL: null,	//URL of the page which is parsed
     * type: "html",		//default type of output
     */
    resolvePaths: false,
};

// 3. the readability class
class Readability {
    constructor(settings) {
        this.onreset();
        this._processSettings(settings);
    }

    onreset() {
        // The root node
        this._currentElement = new Element("document");
        this._topCandidate = null;
        this._origTitle = this._headerTitle = "";
        this._scannedLinks = new Map();
    }

    _processSettings(settings) {
        this._settings = {};

        for (const i in defaultSettings) {
            this._settings[i] =
                typeof settings[i] !== "undefined"
                    ? settings[i]
                    : defaultSettings[i];
        }

        let path;
        if (settings.pageURL) {
            path = settings.pageURL.split(re_slashes);
            this._url = {
                protocol: path[0],
                domain: path[1],
                path: path.slice(2, -1),
                full: settings.pageURL.replace(re_closing, ""),
            };
            this._baseURL = this._getBaseURL();
        }
        if (settings.type) this._settings.type = settings.type;
    }

    _convertLinks(path) {
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

    _getBaseURL() {
        if (this._url.path.length === 0) {
            // Return what we got
            return this._url.full.replace(re_params, "");
        }

        let cleaned = "";
        const elementNum = this._url.path.length - 1;

        for (let i = 0; i < elementNum; i++) {
            // Split off and save anything that looks like a file type and "00,"-trash.
            cleaned += `/${this._url.path[i].replace(re_extension, "")}`;
        }

        const first = this._url.full.replace(re_params, "").replace(/.*\//, "");
        const second = this._url.path[elementNum];

        if (
            !(second.length < 3 && re_noLetters.test(first)) &&
            !re_justDigits.test(second)
        ) {
            cleaned += `/${
                re_pageInURL.test(second)
                    ? second.replace(re_pageInURL, "")
                    : second
            }`;
        }

        if (!re_badFirst.test(first)) {
            cleaned += `/${
                re_pageInURL.test(first)
                    ? first.replace(re_pageInURL, "")
                    : first
            }`;
        }

        // This is our final, cleaned, base article URL.
        return `${this._url.protocol}//${this._url.domain}${cleaned}`;
    }

    _scanLink(elem) {
        let { href } = elem.attributes;

        if (!href) return;
        href = href.replace(re_closing, "");

        if (href in this._settings.linksToSkip) return;
        if (href === this._baseURL || (this._url && href === this._url.full)) {
            return;
        }

        const match = href.match(re_domain);

        if (!match) return;
        if (this._url && match[1] !== this._url.domain) return;

        const text = elem.toString();
        if (text.length > 25 || re_extraneous.test(text)) return;
        if (!re_digits.test(href.replace(this._baseURL, ""))) return;

        let score = 0;
        const linkData = text + elem.elementData;

        if (re_nextLink.test(linkData)) score += 50;
        if (re_pages.test(linkData)) score += 25;

        if (re_final.test(linkData)) {
            if (!re_nextLink.test(text)) {
                if (
                    !(
                        this._scannedLinks.has(href) &&
                        re_nextLink.test(this._scannedLinks.get(href).text)
                    )
                ) {
                    score -= 65;
                }
            }
        }

        if (re_negative.test(linkData) || re_extraneous.test(linkData)) {
            score -= 50;
        }
        if (re_prevLink.test(linkData)) score -= 200;

        if (re_pagenum.test(href) || re_pages.test(href)) score += 25;
        if (re_extraneous.test(href)) score -= 15;

        let current = elem;
        let posMatch = true;
        let negMatch = true;

        while ((current = current.parent)) {
            if (current.elementData === "") continue;
            if (posMatch && re_pages.test(current.elementData)) {
                score += 25;
                if (!negMatch) break;
                else posMatch = false;
            }
            if (
                negMatch &&
                re_negative.test(current.elementData) &&
                !re_positive.test(current.elementData)
            ) {
                score -= 25;
                if (!posMatch) break;
                else negMatch = false;
            }
        }

        const parsedNum = parseInt(text, 10);
        if (parsedNum < 10) {
            if (parsedNum === 1) score -= 10;
            else score += 10 - parsedNum;
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
    onopentagname(name) {
        if (name in noContent) {
            if (name in formatTags) {
                this._currentElement.children.push(formatTags[name]);
            }
        } else this._currentElement = new Element(name, this._currentElement);
    }

    onattribute(name, value) {
        if (!value) return;
        name = name.toLowerCase();

        const elem = this._currentElement;

        if (name === "href" || name === "src") {
            // Fix links
            if (re_protocol.test(value)) elem.attributes[name] = value;
            else elem.attributes[name] = this._convertLinks(value);
        } else if (name === "id" || name === "class") {
            value = value.toLowerCase();
            if (!this._settings.weightClasses);
            else if (re_safe.test(value)) {
                elem.attributeScore += 300;
                elem.isCandidate = true;
            } else if (re_negative.test(value)) elem.attributeScore -= 25;
            else if (re_positive.test(value)) elem.attributeScore += 25;

            elem.elementData += ` ${value}`;
        } else if (
            elem.name === "img" &&
            (name === "width" || name === "height")
        ) {
            value = parseInt(value, 10);
            if (value !== value);
            else if (value <= 32) {
                /*
                 * NaN (skip)
                 * skip the image
                 * (use a tagname that's part of tagsToSkip)
                 */
                elem.name = "script";
            } else if (name === "width" ? value >= 390 : value >= 290) {
                // Increase score of parent
                elem.parent.attributeScore += 20;
            } else if (name === "width" ? value >= 200 : value >= 150) {
                elem.parent.attributeScore += 5;
            }
        } else if (this._settings.cleanAttributes) {
            if (goodAttributes.has(name)) elem.attributes[name] = value;
        } else elem.attributes[name] = value;
    }

    ontext(text) {
        this._currentElement.children.push(text);
    }

    onclosetag(tagName) {
        if (tagName in noContent) return;

        let elem = this._currentElement;

        this._currentElement = elem.parent;

        // Prepare title
        if (this._settings.searchFurtherPages && tagName === "a") {
            this._scanLink(elem);
        } else if (tagName === "title" && !this._origTitle) {
            this._origTitle = elem
                .toString()
                .trim()
                .replace(re_whitespace, " ");
            return;
        } else if (headerTags.has(tagName)) {
            const title = elem.toString().trim().replace(re_whitespace, " ");
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
            re_unlikelyCandidates.test(elem.elementData) &&
            !re_okMaybeItsACandidate.test(elem.elementData)
        ) {
            return;
        }
        if (
            tagName === "div" &&
            elem.children.length === 1 &&
            typeof elem.children[0] === "object" &&
            unpackDivs.has(elem.children[0].name)
        ) {
            // Unpack divs
            elem.parent.children.push(elem.children[0]);
            return;
        }

        elem.addInfo();

        // Clean conditionally
        if (embeds.has(tagName)) {
            // Check if tag is wanted (youtube or vimeo)
            if (
                !(
                    "src" in elem.attributes &&
                    re_videos.test(elem.attributes.src)
                )
            ) {
                return;
            }
        } else if (tagName === "h2" || tagName === "h3") {
            // Clean headers
            if (elem.attributeScore < 0 || elem.info.density > 0.33) return;
        } else if (
            this._settings.cleanConditionally &&
            cleanConditionally.has(tagName)
        ) {
            const p = elem.info.tagCount.p || 0;
            const contentLength = elem.info.textLength + elem.info.linkLength;

            if (contentLength === 0) {
                if (elem.children.length === 0) return;
                if (
                    elem.children.length === 1 &&
                    typeof elem.children[0] === "string"
                ) {
                    return;
                }
            }
            if (
                elem.info.tagCount.li - 100 > p &&
                tagName !== "ul" &&
                tagName !== "ol"
            ) {
                return;
            }
            if (
                contentLength < 25 &&
                (!("img" in elem.info.tagCount) || elem.info.tagCount.img > 2)
            ) {
                return;
            }
            if (elem.info.density > 0.5) return;
            if (elem.attributeScore < 25 && elem.info.density > 0.2) return;
            if (
                (elem.info.tagCount.embed === 1 && contentLength < 75) ||
                elem.info.tagCount.embed > 1
            ) {
                return;
            }
        }

        if (
            (removeIfEmpty.has(tagName) ||
                (!this._settings.cleanConditionally &&
                    cleanConditionally.has(tagName))) &&
            elem.info.linkLength === 0 &&
            elem.info.textLength === 0 &&
            elem.children.length !== 0 &&
            !okayIfEmpty.some((tag) => tag in elem.info.tagCount)
        ) {
            return;
        }

        if (
            this._settings.replaceImgs &&
            tagName === "a" &&
            elem.children.length === 1 &&
            elem.children[0].name === "img" &&
            re_imgUrl.test(elem.attributes.href)
        ) {
            elem = elem.children[0];
            elem.attributes.src = elem.parent.attributes.href;
        }

        elem.parent.children.push(elem);

        // Should node be scored?
        if (tagName === "p" || tagName === "pre" || tagName === "td");
        else if (tagName === "div") {
            // Check if div should be converted to a p
            if (divToPElements.some((name) => name in elem.info.tagCount)) {
                return;
            }
            elem.name = "p";
        } else return;

        if (
            elem.info.textLength + elem.info.linkLength > 24 &&
            elem.parent &&
            elem.parent.parent
        ) {
            elem.parent.isCandidate = elem.parent.parent.isCandidate = true;
            const addScore =
                1 +
                elem.info.commas +
                Math.min(
                    Math.floor(
                        (elem.info.textLength + elem.info.linkLength) / 100
                    ),
                    3
                );
            elem.parent.tagScore += addScore;
            elem.parent.parent.tagScore += addScore / 2;
        }
    }

    _getCandidateNode() {
        let elem = this._topCandidate;
        let elems;
        if (!elem) {
            elem = this._topCandidate = this._currentElement.getTopCandidate();
        }

        if (!elem) {
            // Select root node
            elem = this._currentElement;
        } else if (elem.parent.children.length > 1) {
            elems = getCandidateSiblings(elem);

            // Create a new object so that the prototype methods are callable
            elem = new Element("div");
            elem.children = elems;
            elem.addInfo();
        }

        while (elem.children.length === 1) {
            if (typeof elem.children[0] === "object") {
                elem = elem.children[0];
            } else break;
        }

        return elem;
    }

    // SkipLevel is a shortcut to allow more elements of the page
    setSkipLevel(skipLevel) {
        if (skipLevel === 0) return;

        // If the prototype is still used for settings, change that
        if (this._settings === Readability.prototype._settings) {
            this._processSettings({});
        }

        if (skipLevel > 0) this._settings.stripUnlikelyCandidates = false;
        if (skipLevel > 1) this._settings.weightClasses = false;
        if (skipLevel > 2) this._settings.cleanConditionally = false;
    }

    getTitle() {
        if (this._headerTitle) return this._headerTitle;
        if (!this._origTitle) return "";

        let curTitle = this._origTitle;

        if (/ [|-] /.test(curTitle)) {
            curTitle = curTitle.replace(/(.*) [|-] .*/g, "$1");

            if (curTitle.split(" ").length !== 3) {
                curTitle = this._origTitle.replace(/.*?[|-] /, "");
            }
        } else if (curTitle.includes(": ")) {
            curTitle = curTitle.substr(curTitle.lastIndexOf(": ") + 2);

            if (curTitle.split(" ").length !== 3) {
                curTitle = this._origTitle.substr(
                    this._origTitle.indexOf(": ")
                );
            }
        }
        // TODO: support arrow ("\u00bb")

        curTitle = curTitle.trim();

        if (curTitle.split(" ").length !== 5) return this._origTitle;
        return curTitle;
    }

    getNextPage() {
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

    getHTML(node) {
        if (!node) node = this._getCandidateNode();
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

    getText(node = this._getCandidateNode()) {
        return node
            .getFormattedText()
            .trim()
            .replace(/\n+(?=\n{2})/g, "");
    }

    getEvents(cbs) {
        (function process(node) {
            cbs.onopentag(node.name, node.attributes);
            node.children.forEach((child) =>
                typeof child === "string" ? cbs.ontext(child) : process(child)
            );
            cbs.onclosetag(node.name);
        })(this._getCandidateNode());
    }

    getArticle(type) {
        const elem = this._getCandidateNode();

        const ret = {
            title: this._headerTitle || this.getTitle(),
            nextPage: this.getNextPage(),
            textLength: elem.info.textLength,
            score: this._topCandidate ? this._topCandidate.totalScore : 0,
        };

        if (!type && this._settings.type) ({ type } = this._settings);

        if (type === "text") ret.text = this.getText(elem);
        else ret.html = this.getHTML(elem);

        return ret;
    }
}

module.exports = Readability;
