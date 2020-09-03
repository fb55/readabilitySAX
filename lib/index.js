module.exports = {
    Readability: require("../readabilitySAX"),
    get: require("./getURL"),
    process: require("./process"),
    WritableStream: require("./WritableStream"),
    createWritableStream(settings, cb) {
        return new module.exports.WritableStream(settings, cb);
    },
};
