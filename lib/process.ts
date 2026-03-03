import { Parser } from "htmlparser2";
import Readability from "../readability-sax";
import type {
    ArticleResult,
    ReadabilityConstructor,
    ReadabilitySettings,
} from "./types";

/**
 * Parse HTML and return the extracted article.
 * @param data HTML source.
 * @param settings Readability settings.
 * @param skipLevel Initial skip level for fallback parsing passes.
 */
export default function process(
    data: string,
    settings: ReadabilitySettings,
    skipLevel?: number
): ArticleResult {
    skipLevel ??= 0;

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
}
