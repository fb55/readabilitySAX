import fs from "node:fs";
import { createWritableStream } from "../lib";
import type { ArticleResult } from "../lib/types";

const directory = "/Users/felix/Downloads/CleanEval/finalrun-input/";
const files = fs.readdirSync(directory);
const total = files.length;
const stats = {
    time: 0,
    skipped: 0,
    min: Infinity,
    max: -Infinity,
};

function run(name: string | undefined) {
    if (!name || name.startsWith(".")) return proc();

    const file = fs.readFileSync(directory + name).toString();
    const start = Date.now();

    createWritableStream((article: ArticleResult) => {
        if (article.score) {
            const took = Date.now() - start;
            stats.time += took;
            if (took < stats.min) stats.min = took;
            if (took > stats.max) stats.max = took;
        } else {
            stats.skipped++;
        }
    }).end(file);
}

function proc() {
    if (files.length === 0) return;
    run(files.pop());
    queueMicrotask(proc);
    if (files.length % 10 === total % 10) {
        console.log("did", total - files.length);
    }
}

proc();

process.on("exit", () => {
    const did = total - stats.skipped;
    console.log("took", stats.time);
    console.log("runs", did);
    console.log("average", Math.round((stats.time / did) * 1e4) / 1e4);
    console.log("min", stats.min);
    console.log("max", stats.max);
    console.log("skipped", stats.skipped);
});
