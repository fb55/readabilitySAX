const Readability = require("../readabilitySAX");
const { Parser } = require("htmlparser2");

module.exports = function (data, settings, skipLevel) {
    if (!skipLevel) skipLevel = 0;

    const readable = new Readability(settings);
    const parser = new Parser(readable);
    let article;

    do {
        if (skipLevel !== 0) readable.setSkipLevel(skipLevel);

        parser.parseComplete(data);

        article = readable.getArticle();
        skipLevel += 1;
    } while (article.textLength < 250 && skipLevel < 4);

    return article;
};
