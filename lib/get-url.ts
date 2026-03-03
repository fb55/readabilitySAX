import minreq from "minreq";
import WritableStream from "./writable-stream";
import type {
    ArticleCallback,
    ArticleResult,
    OutputType,
    ReadabilitySettings,
} from "./types";

interface RequestLike {
    response: {
        location: string;
    };
    on(event: "error", callback: (error: Error | string) => void): RequestLike;
    on(
        event: "response",
        callback: (response: { headers: Record<string, string> }) => void
    ): RequestLike;
    pipe(stream: unknown): void;
}

/**
 * Fetch a URL and stream it through readability.
 * @param uri Target URL.
 * @param settings Readability settings or output type.
 * @param callback Callback that receives the parsed article.
 */
export default function getURL(
    uri: string,
    settings: ReadabilitySettings | OutputType | ArticleCallback,
    callback?: ArticleCallback
) {
    if (typeof settings === "function") {
        callback = settings;
        settings = {};
    } else if (settings === "text" || settings === "html") {
        settings = { type: settings };
    }

    let callbackHasRun = false;
    function onError(error: Error | string) {
        if (callbackHasRun) return;
        callbackHasRun = true;

        const message = String(error);
        callback!({
            title: "Error",
            text: message,
            html: `<b>${message}</b>`,
            error: true,
        });
    }

    const request = minreq({
        uri,
        only2xx: true,
        headers: {
            "user-agent":
                "Mozilla/5.0 (compatible; readabilitySAX/1.5; +https://github.com/fb55/readabilitySAX)",
        },
    }) as RequestLike;

    request.on("error", onError).on("response", (response) => {
        if (
            "content-type" in response.headers &&
            !response.headers["content-type"].startsWith("text/")
        ) {
            // Text/plain should still be allowed to flow through readability.
            onError("document isn't text");
            return;
        }

        settings.pageURL = request.response.location;
        const stream = new WritableStream(
            settings,
            (article: ArticleResult) => {
                if (callbackHasRun) {
                    console.log("got article with called callback");
                    return;
                }

                article.link = request.response.location;
                callback!(article);
            }
        );

        request.pipe(stream);
    });
}
