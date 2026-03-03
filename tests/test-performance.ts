import fs from "node:fs";
import { Parser } from "htmlparser2";
import { process as processReadableContent } from "../lib";
import Readability from "../readability-sax";
import type { ReadabilitySettings } from "../lib/types";

function benchmark(times: number, task: () => void) {
    const start = Date.now();
    while (times-- > 0) task();
    return Date.now() - start;
}

const processContent = function (data: string, settings: ReadabilitySettings) {
    const readable = new Readability(settings);
    const parser = new Parser(readable);

    console.log(
        "parsing took (ms):",
        benchmark(1e3, () => {
            parser.parseComplete(data);
        })
    );
    console.log(
        "getHTML took (ms):",
        benchmark(1e3, () => {
            readable.getHTML();
        })
    );
    console.log(
        "getText took (ms):",
        benchmark(1e3, () => {
            readable.getText();
        })
    );
    console.log(
        "getArticle took (ms):",
        benchmark(1e3, () => {
            readable.getArticle();
        })
    );
    console.log(
        "Whole parsing took (ms):",
        benchmark(500, () => {
            processReadableContent(data, settings);
        })
    );
};

if (process.argv.length > 2) {
    console.log("connecting to:", process.argv[2]);

    fetch(process.argv[2])
        .then((response) => {
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch ${process.argv[2]}: ${response.status}`
                );
            }
            return response.text().then((body) => ({ body, url: response.url }));
        })
        .then(({ body, url }) => {
            processContent(body, {
                pageURL: url,
                log: false,
            });
        })
        .catch((error: unknown) => {
            console.error(error);
            process.exitCode = 1;
        });
} else {
    const file = fs.readFileSync(`${__dirname}/testpage.html`, "utf8");
    processContent(file, {
        pageURL: "http://howtonode.org/heat-tracer",
        log: false,
    });
}
