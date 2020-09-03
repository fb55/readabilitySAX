#!/usr/bin/env node

if (process.argv.length < 3 || !/^https?:\/\//.test(process.argv[2])) {
    console.log("Usage: readability http://domain.tld/sub [format]");
    return;
}

require("./getURL.js")(
    process.argv[2],
    process.argv[3] === "html" ? "html" : "text",
    (result) => {
        if (result.error) return console.log("ERROR:", result.text);

        // Else
        console.log("TITLE:", result.title);
        console.log("SCORE:", result.score);
        if (result.nextPage) console.log("NEXT PAGE:", result.nextPage);
        console.log("LENGTH:", result.textLength);
        console.log("");

        let text;
        if ("text" in result) {
            text = require("entities").decodeHTML5(result.text);
        } else {
            text = result.html.replace(/\s+/g, " ");
        }
        process.stdout.write(`${text}\n`);

        process.exit();
    }
);
