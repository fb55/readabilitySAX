import type {
    ArticleResult,
    ReadabilityConstructor,
    ReadabilitySettings,
} from "./types";

const Readability = require("../readabilitySAX");
const { Parser } = require("htmlparser2");

module.exports = function (
    data: string,
    settings: ReadabilitySettings,
    skipLevel?: number
): ArticleResult {
    if (!skipLevel) skipLevel = 0;

    const ReadabilityClass = Readability as ReadabilityConstructor;
    const readable = new ReadabilityClass(settings);
    const parser = new Parser(readable);
    let article: ArticleResult;

    do {
        if (skipLevel !== 0) readable.setSkipLevel(skipLevel);

        parser.parseComplete(data);

        article = readable.getArticle();
        skipLevel += 1;
    } while ((article.textLength ?? 0) < 250 && skipLevel < 4);

    return article;
};
