import WritableStream from "./writable-stream";
import type { ArticleCallback, ReadabilitySettings } from "./types";

export { default as Readability } from "../readability-sax";
export { default as get } from "./get-url";
export { default as process } from "./process";
export { default as WritableStream } from "./writable-stream";

/**
 * Create a writable readability stream for incremental HTML input.
 * @param settings Readability settings or article callback.
 * @param callback Callback invoked with the extracted article.
 */
export function createWritableStream(
    settings: ReadabilitySettings | ArticleCallback,
    callback?: ArticleCallback,
) {
    return new WritableStream(settings, callback);
}
