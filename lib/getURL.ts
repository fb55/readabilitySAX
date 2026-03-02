import type {
    ArticleCallback,
    ArticleResult,
    OutputType,
    ReadabilitySettings,
} from "./types";

const WritableStream = require("./WritableStream");
const minreq = require("minreq");

type RequestLike = {
    response: {
        location: string;
    };
    on(event: "error", cb: (err: Error | string) => void): RequestLike;
    on(
        event: "response",
        cb: (resp: { headers: Record<string, string> }) => void
    ): RequestLike;
    pipe(stream: NodeJS.WritableStream): void;
};

module.exports = function (
    uri: string,
    settings: ReadabilitySettings | OutputType | ArticleCallback,
    cb?: ArticleCallback
) {
    let callback = cb;
    if (typeof settings === "function") {
        callback = settings;
        settings = {};
    } else if (settings === "text" || settings === "html") {
        settings = { type: settings };
    }

    let calledCB = false;
    function onErr(err: Error | string) {
        if (calledCB) return;
        calledCB = true;

        err = String(err);
        callback!({
            title: "Error",
            text: err,
            html: `<b>${err}</b>`,
            error: true,
        });
    }

    const req = minreq({
        uri,
        only2xx: true,
        headers: {
            "user-agent":
                "Mozilla/5.0 (compatible; readabilitySAX/1.5; +https://github.com/fb55/readabilitySAX)",
        },
    }) as RequestLike;
    req.on("error", onErr).on("response", (resp) => {
        if (
            "content-type" in resp.headers &&
            resp.headers["content-type"].substr(0, 5) !== "text/"
        ) {
            // TODO we're actually only interested in text/html, but text/plain shouldn't result in an error (as it will be forwarded)
            onErr("document isn't text");
            return;
        }
        settings.pageURL = req.response.location;

        const stream = new WritableStream(
            settings,
            (article: ArticleResult) => {
                if (calledCB) {
                    console.log("got article with called cb");
                    return;
                }
                article.link = req.response.location;
                callback!(article);
            }
        ) as NodeJS.WritableStream;
        req.pipe(stream);
    });
};
