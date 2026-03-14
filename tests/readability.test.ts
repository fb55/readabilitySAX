import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { Parser } from "htmlparser2";
import { process as processArticle } from "../lib";
import Readability from "../readability-sax";

const fixture = fs.readFileSync(
    `${__dirname}/../../tests/testpage.html`,
    "utf8",
);

function parseFixture(settings = {}) {
    const readable = new Readability(
        Object.assign(
            {
                pageURL: "http://howtonode.org/heat-tracer/",
                resolvePaths: true,
            },
            settings,
        ),
    );
    const parser = new Parser(readable);
    parser.parseComplete(fixture);
    return {
        article: readable.getArticle(),
        readable,
    };
}

test("supports default constructor settings", () => {
    assert.doesNotThrow(() => new Readability());
});

test("extracts article metadata and content from fixture", () => {
    const { article, readable } = parseFixture();

    assert.equal(article.title, "How To Node - NodeJS");
    assert.equal(
        article.nextPage,
        "http://howtonode.org/heat-tracer/dummy/page/2",
    );
    assert.equal(article.textLength, 7935);
    assert.equal(article.score, 82);
    assert.equal(readable._scannedLinks.size, 2);

    assert.ok(article.html?.includes("<h2>System Requirements</h2>"));
    assert.ok(article.html?.includes("<h2>Security</h2>"));
    assert.ok(article.html?.includes("<h2>Dependencies</h2>"));
});

test("resolves relative URLs based on pageURL", () => {
    const readable = new Readability({
        pageURL: "http://foo.bar/this.2/is/a/long/path/index?isnt=it",
        resolvePaths: true,
    });

    assert.deepEqual(readable._url, {
        protocol: "http:",
        domain: "foo.bar",
        path: ["this.2", "is", "a", "long", "path"],
        full: "http://foo.bar/this.2/is/a/long/path/index?isnt=it",
    });
    assert.equal(readable._baseURL, "http://foo.bar/this.2/is/a/long/path");
    assert.equal(
        readable._convertLinks("../asdf/foo/"),
        "http://foo.bar/this.2/is/a/long/asdf/foo/",
    );
    assert.equal(
        readable._convertLinks("/asdf/foo/"),
        "http://foo.bar/asdf/foo/",
    );
    assert.equal(
        readable._convertLinks("foo/"),
        "http://foo.bar/this.2/is/a/long/path/foo/",
    );
});

test("high-level process API returns text output", () => {
    const article = processArticle(fixture, {
        pageURL: "http://howtonode.org/heat-tracer/",
        resolvePaths: true,
        type: "text",
    });

    assert.equal(typeof article.text, "string");
    assert.ok(article.text?.includes("System Requirements"));
    assert.equal(article.title, "How To Node - NodeJS");
});
