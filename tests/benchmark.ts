import fs from "node:fs";
import { createWritableStream } from "../lib";
import type { ArticleResult } from "../lib/types";

const directory = "/Users/felix/Downloads/CleanEval/finalrun-input/";
const files = fs.readdirSync(directory);
let time = 0;
const total = files.length;
let skipped = 0;
let min = Number.POSITIVE_INFINITY;
let max = Number.NEGATIVE_INFINITY;

function run(name: string | undefined) {
    if (!name || name.startsWith(".")) return proc();

    const file = fs.readFileSync(directory + name).toString();
    const start = Date.now();

    createWritableStream((article: ArticleResult) => {
        if (article.score) {
            const took = Date.now() - start;
            time += took;
            if (took < min) min = took;
            if (took > max) max = took;
        } else {
            skipped++;
        }
    }).end(file);
}

function proc() {
    if (files.length === 0) return;
    run(files.pop());
    process.nextTick(proc);
    if (files.length % 10 === total % 10) {
        console.log("did", total - files.length);
    }
}

proc();

process.on("exit", () => {
    const did = total - skipped;
    console.log("took", time);
    console.log("runs", did);
    console.log("average", Math.round((time / did) * 1e4) / 1e4);
    console.log("min", min);
    console.log("max", max);
    console.log("skipped", skipped);
});
