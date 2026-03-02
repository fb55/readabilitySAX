import type { ReadabilitySettings } from "../lib/types";

const getReadableContent = require("../");
const { Parser } = require("htmlparser2");
const Readability = require("../readabilitySAX");
const request = require("request");
const url = require("url");

function ben(times: number, func: () => void) {
    const start = Date.now();
    while (times-- > 0) func();
    return Date.now() - start;
}

const processContent = function (data: string, settings: ReadabilitySettings) {
    const readable = new Readability(settings);
    const parser = new Parser(readable);

    console.log(
        "parsing took (ms):",
        ben(1e3, () => {
            parser.parseComplete(data);
        })
    );
    console.log(
        "getHTML took (ms):",
        ben(1e3, () => {
            readable.getHTML();
        })
    );
    console.log(
        "getText took (ms):",
        ben(1e3, () => {
            readable.getText();
        })
    );
    console.log(
        "getArticle took (ms):",
        ben(1e3, () => {
            readable.getArticle();
        })
    );
    console.log(
        "Whole parsing took (ms):",
        ben(500, () => {
            getReadableContent.process(data, settings);
        })
    );
};

if (process.argv.length > 2) {
    console.log("connecting to:", process.argv[2]);

    request(
        process.argv[2],
        (
            err: Error | null,
            resp: { request: { uri: string } },
            body: string
        ) => {
            if (err) throw err;
            processContent(body, {
                pageURL: url.format(resp.request.uri),
                log: false,
            });
        }
    );
} else {
    const file = require("fs").readFileSync(
        `${__dirname}/testpage.html`,
        "utf8"
    );
    processContent(file, {
        pageURL: "http://howtonode.org/heat-tracer",
        log: false,
    });
}
