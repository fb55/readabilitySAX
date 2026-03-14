import type { Handler } from "htmlparser2";

/** Output format supported by readability. */
export type OutputType = "text" | "html";

/** Options that influence readability scoring and output. */
export interface ReadabilitySettings {
    stripUnlikelyCandidates?: boolean;
    weightClasses?: boolean;
    cleanConditionally?: boolean;
    cleanAttributes?: boolean;
    replaceImgs?: boolean;
    searchFurtherPages?: boolean;
    linksToSkip?: Record<string, boolean>;
    pageURL?: string;
    type?: OutputType;
    resolvePaths?: boolean;
}

/** Readability extraction result for one document. */
export interface ArticleResult {
    title: string;
    nextPage?: string;
    textLength?: number;
    score?: number;
    text?: string;
    html?: string;
    error?: boolean;
    link?: string;
}

/** Callback invoked when a parsed article is ready. */
export type ArticleCallback = (article: ArticleResult) => void;

/** Minimal shape of the readability class used by stream/process helpers. */
export interface ReadabilityLike extends Partial<Handler> {
    setSkipLevel(skipLevel: number): void;
    getArticle(type?: OutputType): ArticleResult;
    getHTML?(node?: unknown): string;
    getText?(node?: unknown): string;
    _getCandidateNode(): {
        info: {
            textLength: number;
        };
    };
}
