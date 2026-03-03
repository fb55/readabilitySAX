const rePageInURL = /[_-]?p[a-zA-Z]*[_-]?\d{1,2}$/;
const reBadFirst = /^(?:[^a-z]{0,3}|index|\d+)$/i;
const reNoLetters = /[^a-zA-Z]/;
const reParameters = /\?.*/;
const reExtension = /00,|\.[a-zA-Z]+$/g;
const reJustDigits = /^\d{1,2}$/;

/** Parsed URL details used to infer an article base URL. */
export interface URLInfo {
    path: string[];
    full: string;
    protocol: string;
    domain: string;
}

/**
 * Normalize a URL into its article base path for pagination matching.
 * @param url Parsed URL details.
 */
export function getBaseURL(url: URLInfo): string {
    if (url.path.length === 0) {
        // Return what we got.
        return url.full.replace(reParameters, "");
    }

    let cleaned = "";
    const lastPathIndex = url.path.length - 1;

    for (let index = 0; index < lastPathIndex; index++) {
        // Split off and save anything that looks like a file type and "00,"-trash.
        cleaned += `/${url.path[index].replace(reExtension, "")}`;
    }

    const first = url.full.replace(reParameters, "").replace(/.*\//, "");
    const second = url.path[lastPathIndex];

    if (
        !(second.length < 3 && reNoLetters.test(first)) &&
        !reJustDigits.test(second)
    ) {
        cleaned += `/${
            rePageInURL.test(second) ? second.replace(rePageInURL, "") : second
        }`;
    }

    if (!reBadFirst.test(first)) {
        cleaned += `/${
            rePageInURL.test(first) ? first.replace(rePageInURL, "") : first
        }`;
    }

    // This is our final, cleaned, base article URL.
    return `${url.protocol}//${url.domain}${cleaned}`;
}
