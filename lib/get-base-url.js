const re_pageInURL = /[_-]?p[a-zA-Z]*[_-]?\d{1,2}$/;
const re_badFirst = /^(?:[^a-z]{0,3}|index|\d+)$/i;
const re_noLetters = /[^a-zA-Z]/;
const re_params = /\?.*/;
const re_extension = /00,|\.[a-zA-Z]+$/g;
const re_justDigits = /^\d{1,2}$/;

function getBaseURL(url) {
    if (url.path.length === 0) {
        // Return what we got
        return url.full.replace(re_params, "");
    }

    let cleaned = "";
    const elementNum = url.path.length - 1;

    for (let i = 0; i < elementNum; i++) {
        // Split off and save anything that looks like a file type and "00,"-trash.
        cleaned += `/${url.path[i].replace(re_extension, "")}`;
    }

    const first = url.full.replace(re_params, "").replace(/.*\//, "");
    const second = url.path[elementNum];

    if (
        !(second.length < 3 && re_noLetters.test(first)) &&
        !re_justDigits.test(second)
    ) {
        cleaned += `/${
            re_pageInURL.test(second)
                ? second.replace(re_pageInURL, "")
                : second
        }`;
    }

    if (!re_badFirst.test(first)) {
        cleaned += `/${
            re_pageInURL.test(first) ? first.replace(re_pageInURL, "") : first
        }`;
    }

    // This is our final, cleaned, base article URL.
    return `${url.protocol}//${url.domain}${cleaned}`;
}

module.exports = {
    getBaseURL,
};
