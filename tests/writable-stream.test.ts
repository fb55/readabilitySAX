import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import WritableStream from "../lib/writable-stream";
import type { ArticleResult } from "../lib/types";

const longHtml = `<html><body><article><p>${"Streaming parser coverage text. ".repeat(20)}</p></article></body></html>`;
const shortHtml = "<html><body><p>Short</p></body></html>";

test("writable-stream accepts string chunks", async () => {
    let articleResult: ArticleResult | undefined;
    const stream = new WritableStream({ type: "text" }, (article) => {
        articleResult = article;
    });

    stream.write("<html><body><article><p>");
    stream.end(
        `${"String chunk coverage ".repeat(20)}</p></article></body></html>`,
    );
    await once(stream, "finish");

    assert.ok(articleResult);
    assert.equal(typeof articleResult.text, "string");
    assert.match(articleResult.text ?? "", /String chunk coverage/);
});

test("writable-stream accepts buffer chunks", async () => {
    let articleResult: ArticleResult | undefined;
    const stream = new WritableStream({ type: "text" }, (article) => {
        articleResult = article;
    });

    stream.write(Buffer.from("<html><body><article><p>"));
    stream.end(
        Buffer.from(
            `${"Buffer chunk coverage ".repeat(20)}</p></article></body></html>`,
        ),
    );
    await once(stream, "finish");

    assert.ok(articleResult);
    assert.equal(typeof articleResult.text, "string");
    assert.match(articleResult.text ?? "", /Buffer chunk coverage/);
});

test("writable-stream supports callback-only constructor overload", async () => {
    let articleResult: ArticleResult | undefined;
    const stream = new WritableStream((article) => {
        articleResult = article;
    });

    stream.end(longHtml);
    await once(stream, "finish");

    assert.ok(articleResult);
    assert.equal(typeof articleResult.html, "string");
    assert.match(articleResult.html ?? "", /Streaming parser coverage text/);
});

test("writable-stream invokes skip-level fallback for short documents", async () => {
    const stream = new WritableStream({ type: "text" }, () => {
        // No-op
    });

    const internalReadable = stream as unknown as {
        _readability: {
            setSkipLevel: (skipLevel: number) => void;
        };
    };
    const originalSetSkipLevel =
        internalReadable._readability.setSkipLevel.bind(
            internalReadable._readability,
        );
    const skipLevels: number[] = [];

    internalReadable._readability.setSkipLevel = (skipLevel: number) => {
        skipLevels.push(skipLevel);
        originalSetSkipLevel(skipLevel);
    };

    stream.end(shortHtml);
    await once(stream, "finish");

    assert.deepEqual(skipLevels, [1, 2, 3]);
});
