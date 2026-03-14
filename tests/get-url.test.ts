import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import * as undici from "undici";
import getURL from "../lib/get-url";
import type { ArticleResult, ReadabilitySettings } from "../lib/types";

const htmlBody = `<html><head><title>Example title</title></head><body><article><p>${"Readability coverage paragraph. ".repeat(20)}</p></article></body></html>`;

const originalCompose = undici.Client.prototype.compose;
const originalStream = undici.Client.prototype.stream;
const originalClose = undici.Client.prototype.close;

test.before(() => {
    undici.Client.prototype.compose = function compose() {
        return this;
    };

    undici.Client.prototype.stream = function stream(options, factory) {
        const path = String(options.path);
        let statusCode = 200;
        let headers: Record<string, string | string[]> = {
            "content-type": "text/html",
        };
        let context: { history?: URL[] } = {};

        switch (path) {
            case "/json": {
                headers = { "content-type": "application/json" };
                break;
            }
            case "/error": {
                statusCode = 500;
                break;
            }
            case "/redirect": {
                context = { history: [new URL("https://example.com/final")] };
                break;
            }
            default: {
                break;
            }
        }

        let writable;
        try {
            writable = factory({
                statusCode,
                headers,
                context,
                opaque: undefined as never,
            });
        } catch (error) {
            return Promise.reject(error);
        }

        writable.write(htmlBody);
        writable.end();

        return once(writable, "finish").then(
            () => ({ opaque: undefined as never, trailers: {} }) as never
        );
    };

    undici.Client.prototype.close = function close() {
        return Promise.resolve();
    };
});

test.after(() => {
    undici.Client.prototype.compose = originalCompose;
    undici.Client.prototype.stream = originalStream;
    undici.Client.prototype.close = originalClose;
});

async function getArticle(
    url: string,
    settings: ReadabilitySettings | "text" | "html"
): Promise<ArticleResult> {
    return await new Promise<ArticleResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Timed out waiting for getURL callback"));
        }, 1000);

        getURL(url, settings, (article) => {
            clearTimeout(timeout);
            resolve(article);
        });
    });
}

test("get-url returns text output for HTML pages", async () => {
    const article = await getArticle("https://example.com/html", "text");

    assert.equal(article.error, undefined);
    assert.equal(article.link, "https://example.com/html");
    assert.equal(typeof article.text, "string");
    assert.match(article.text ?? "", /Readability coverage paragraph/);
});

test("get-url follows redirects and updates pageURL", async () => {
    const settings: ReadabilitySettings = {};
    const article = await getArticle("https://example.com/redirect", settings);

    assert.equal(article.error, undefined);
    assert.equal(article.link, "https://example.com/final");
    assert.equal(settings.pageURL, "https://example.com/final");
});

test("get-url rejects non-text content types", async () => {
    const article = await getArticle("https://example.com/json", "text");

    assert.equal(article.error, true);
    assert.match(article.text ?? "", /document isn't text/);
});

test("get-url reports HTTP response errors", async () => {
    const article = await getArticle("https://example.com/error", "text");

    assert.equal(article.error, true);
    assert.match(article.text ?? "", /Response Error/);
});
