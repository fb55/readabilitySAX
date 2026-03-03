import { spawn } from "node:child_process";
import fs from "node:fs";
import { decodeHTML5 } from "entities";
import { process as getReadableContent } from "../lib";

const directory = "/Users/felix/Downloads/CleanEval/";
const input = `${directory}finalrun-input/`;
const output = `${directory}finalrun-output/`;

for (const name of fs.readdirSync(input)) {
    if (!name || name.startsWith(".")) continue;

    const article = getReadableContent(fs.readFileSync(input + name).toString(), {
        type: "text",
    });

    // If (article.score < 100) continue;

    fs.writeFileSync(
        output + name.replace(".html", ".txt"),
        (article.title ? `${article.title}\n\n` : "") + decodeHTML5(article.text ?? "")
    );
}

console.log("Finished all files!");

const check = spawn("python", [
    `${directory}cleaneval.py`,
    "-t",
    output,
    `${directory}GoldStandard/`,
]);

check.stdout.pipe(process.stdout);
check.stderr.pipe(process.stderr);
