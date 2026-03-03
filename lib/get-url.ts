import * as undici from "undici";
import WritableStream from "./writable-stream";
import type {
    ArticleCallback,
    ArticleResult,
    OutputType,
    ReadabilitySettings,
} from "./types";

interface RedirectContext {
    history?: URL[];
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

    const urlObject = new URL(uri);
    const client = new undici.Client(urlObject.origin).compose(
        undici.interceptors.redirect({ maxRedirections: 5 })
    );

    void client
        .stream(
            {
                method: "GET",
                path: urlObject.pathname + urlObject.search,
                headers: {
                    "user-agent":
                        "Mozilla/5.0 (compatible; readabilitySAX/1.5; +https://github.com/fb55/readabilitySAX)",
                },
            },
            ({ statusCode, headers, context }) => {
                if (statusCode < 200 || statusCode >= 300) {
                    throw new undici.errors.ResponseError(
                        "Response Error",
                        statusCode,
                        { headers }
                    );
                }

                const contentTypeHeader = headers["content-type"];
                const contentType = Array.isArray(contentTypeHeader)
                    ? contentTypeHeader[0]
                    : contentTypeHeader;

                if (contentType && !contentType.startsWith("text/")) {
                    throw new Error("document isn't text");
                }

                const { history } = context as RedirectContext;
                const redirectedURL =
                    history && history.length > 0
                        ? history[history.length - 1]
                        : null;
                const finalURL = redirectedURL ? redirectedURL.toString() : uri;
                settings.pageURL = finalURL;

                return new WritableStream(settings, (article: ArticleResult) => {
                    if (callbackHasRun) {
                        console.log("got article with called callback");
                        return;
                    }

                    article.link = finalURL;
                    callback!(article);
                });
            }
        )
        .catch(onError)
        .finally(() => {
            void client.close();
        });
}
