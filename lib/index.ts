import type { ArticleCallback, ReadabilitySettings } from "./types";

module.exports = {
    Readability: require("../readabilitySAX"),
    get: require("./getURL"),
    process: require("./process"),
    WritableStream: require("./WritableStream"),
    createWritableStream(
        settings: ReadabilitySettings | ArticleCallback,
        cb?: ArticleCallback
    ) {
        return new module.exports.WritableStream(settings, cb);
    },
};
