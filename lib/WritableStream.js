const Readability = require("../readabilitySAX");
const { Parser, CollectingHandler } = require("htmlparser2");
const { Writable } = require("readable-stream");
const parserOptions = {
    lowerCaseTags: true,
};

module.exports = class WritableStream extends Writable {
    constructor(settings, callback) {
        super();

        if (typeof settings === "function") {
            callback = settings;
            settings = null;
        }
        this._cb = callback;

        this._readability = new Readability(settings);
        this._handler = new CollectingHandler(this._readability);
        this._parser = new Parser(this._handler, parserOptions);
    }

    _write(chunk, encoding, cb) {
        this._parser.write(chunk);
        cb();
    }

    end(chunk) {
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
