const getReadableContent = require("../").process;
const fs = require("fs");
const dir = "/Users/felix/Downloads/CleanEval/";
const input = `${dir}finalrun-input/`;
const output = `${dir}finalrun-output/`;
const ents = require("entities");

fs.readdirSync(input).forEach((name) => {
    if (!name || name.charAt(0) === ".") return;

    const ret = getReadableContent(fs.readFileSync(input + name).toString(), {
        type: "text",
    });

    // If(ret.score < 100) return;

    fs.writeFileSync(
        output + name.replace(".html", ".txt"),
        (ret.title ? `${ret.title}\n\n` : "") + ents.decodeHTML5(ret.text)
    );
});

console.log("Finished all files!");

const check = require("child_process").spawn("python", [
    `${dir}cleaneval.py`,
    "-t",
    output,
    `${dir}GoldStandard/`,
]);

check.stdout.pipe(process.stdout);
check.stderr.pipe(process.stderr);
