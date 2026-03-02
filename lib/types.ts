export type OutputType = "text" | "html";

export type ReadabilitySettings = {
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
    log?: boolean;
};

export type ArticleResult = {
    title: string;
    nextPage?: string;
    textLength?: number;
    score?: number;
    text?: string;
    html?: string;
    error?: boolean;
    link?: string;
};

export type ArticleCallback = (article: ArticleResult) => void;

export type ReadabilityLike = {
    setSkipLevel(skipLevel: number): void;
    getArticle(type?: OutputType): ArticleResult;
    _getCandidateNode(): {
        info: {
            textLength: number;
        };
    };
};

export type ReadabilityConstructor = new (
    settings?: ReadabilitySettings
) => ReadabilityLike;
