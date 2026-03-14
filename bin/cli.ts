import { decodeHTML5 } from "entities";
import getURL from "../lib/get-url";

interface CLIResult {
    error?: boolean;
    text?: string;
    title?: string;
    score?: number;
    nextPage?: string;
    textLength?: number;
    html?: string;
}

function main() {
    if (process.argv.length < 3 || !/^https?:\/\//.test(process.argv[2])) {
        console.log("Usage: readability http://domain.tld/sub [format]");
        process.exitCode = 1;
        return;
    }

    const outputFormat = process.argv[3] === "html" ? "html" : "text";
    getURL(process.argv[2], outputFormat, (result: CLIResult) => {
        if (result.error) {
            console.log("ERROR:", result.text);
            return;
        }

        console.log("TITLE:", result.title);
        console.log("SCORE:", result.score);
        if (result.nextPage) console.log("NEXT PAGE:", result.nextPage);
        console.log("LENGTH:", result.textLength);
        console.log("");

        const text =
            "text" in result
                ? decodeHTML5(result.text ?? "")
                : (result.html ?? "").replace(/\s+/g, " ");
        process.stdout.write(`${text}\n`);
    });
}

main();
