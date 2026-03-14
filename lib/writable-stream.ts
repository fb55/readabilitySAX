import { Writable } from "node:stream";
import { Parser } from "htmlparser2";
import Readability from "../readability-sax";
import type {
    ArticleCallback,
    ReadabilityLike,
    ReadabilitySettings,
} from "./types";

const parserOptions = {
    lowerCaseTags: true,
};

/** Writable stream wrapper that emits a readability article at end of input. */
export default class WritableStream extends Writable {
    private readonly _callback?: ArticleCallback;
    private readonly _readability: ReadabilityLike;
    private readonly _chunks: Uint8Array[] = [];

    constructor(
        settings: ReadabilitySettings | ArticleCallback,
        callback?: ArticleCallback,
    ) {
        super();

        if (typeof settings === "function") {
            callback = settings;
            settings = {};
        }

        this._readability = new Readability(settings);
        this._callback = callback;
    }

    override _write(
        chunk: string | Buffer | Uint8Array,
        encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
    ) {
        if (typeof chunk === "string") {
            this._chunks.push(Buffer.from(chunk, encoding));
        } else {
            this._chunks.push(Buffer.from(chunk));
        }
        callback();
    }

    override _final(callback: (error?: Error | null) => void) {
        const input = Buffer.concat(this._chunks).toString();

        for (let skipLevel = 0; skipLevel < 4; skipLevel++) {
            if (skipLevel > 0) this._readability.setSkipLevel(skipLevel);

            const parser = new Parser(this._readability, parserOptions);
            parser.parseComplete(input);

            if ((this._readability.getArticle().textLength ?? 0) >= 250) {
                break;
            }
        }

        if (this._callback) {
            this._callback(this._readability.getArticle());
        }

        callback();
    }
}
