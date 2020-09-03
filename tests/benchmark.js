const { createWritableStream } = require("../");
const fs = require("fs");
const dir = "/Users/felix/Downloads/CleanEval/finalrun-input/";
const files = fs.readdirSync(dir);
let time = 0;
const total = files.length;
let skipped = 0;
let min = 1 / 0;
let max = -1 / 0;

function run(name) {
    if (!name || name.charAt(0) === ".") return proc();

    const file = fs.readFileSync(dir + name).toString();
    const start = Date.now();

    createWritableStream((ret) => {
        if (!ret.score) skipped++;
        else {
            const took = Date.now() - start;
            time += took;
            if (took < min) min = took;
            if (took > max) max = took;
        }
    }).end(file);
}

function proc() {
    if (!files.length) return;
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
