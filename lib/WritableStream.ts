import type {
    ArticleCallback,
    ReadabilityConstructor,
    ReadabilityLike,
    ReadabilitySettings,
} from "./types";

const Readability = require("../readabilitySAX");
const { Parser, CollectingHandler } = require("htmlparser2");
const { Writable } = require("readable-stream");
const parserOptions = {
    lowerCaseTags: true,
};

module.exports = class WritableStream extends Writable {
    _cb?: ArticleCallback;
    _readability: ReadabilityLike;
    _handler: {
        restart(): void;
    };
    _parser: {
        write(chunk: string | Buffer | Uint8Array): void;
        end(chunk?: string | Buffer | Uint8Array): void;
    };

    constructor(
        settings: ReadabilitySettings | ArticleCallback,
        callback?: ArticleCallback
    ) {
        super();

        if (typeof settings === "function") {
            callback = settings;
            settings = {};
        }
        this._cb = callback;

        const ReadabilityClass = Readability as ReadabilityConstructor;
        this._readability = new ReadabilityClass(settings);
        this._handler = new CollectingHandler(this._readability);
        this._parser = new Parser(this._handler, parserOptions);
    }

    _write(
        chunk: string | Buffer | Uint8Array,
        encoding: BufferEncoding,
        cb: (error?: Error | null) => void
    ) {
        this._parser.write(chunk);
        cb();
    }

    end(chunk?: string | Buffer | Uint8Array) {
        this._parser.end(chunk);
        super.end();

        for (
            let skipLevel = 1;
            this._readability._getCandidateNode().info.textLength < 250 &&
            skipLevel < 4;
            skipLevel++
        ) {
            this._readability.setSkipLevel(skipLevel);
            this._handler.restart();
        }

        if (this._cb) {
            this._cb(this._readability.getArticle());
        }
    }
};
