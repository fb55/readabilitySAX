# readabilitySAX

a fast and platform independent readability port

## About

This is a port of the algorithm used by the
[Readability](http://code.google.com/p/arc90labs-readability/) bookmarklet to
extract relevant pieces of information from websites, using a SAX parser.

The advantage over other ports, e.g.
[arrix/node-readability](https://github.com/arrix/node-readability), is a
smaller memory footprint and a much faster execution. In my tests, most pages,
even large ones, were finished within 15ms (on node, see below for more
information). It works with Rhino, so it runs on
[YQL](http://developer.yahoo.com/yql "Yahoo! Query Language"), which may have
interesting uses. And it works within a browser.

The Readability extraction algorithm was completely ported, but some adjustments
were made:

-   `<article>` and `<section>` tags are recognized and gain a higher value

-   If a heading is part of the pages `<title>`, it is removed (Readability
    removed any single `<h2>`, and ignored other tags)

-   `henry` and `instapaper-body` are classes to show an algorithm like this
    where the content is. readabilitySAX recognizes them and adds additional
    points

-   Every bit of code that was taken from the original algorithm was optimized,
    eg. RegExps should now perform faster (they were optimized & use
    `RegExp#test` instead of `String#match`, which doesn't force the interpreter
    to build an array)

-   Some improvements made by
    [GGReadability](https://github.com/curthard89/COCOA-Stuff/tree/master/GGReadability)
    (an Obj-C port of Readability) were adopted
    -   Images get additional scores when their `height` or `width` attributes
        are high - icon sized images (<= 32px) get skipped
    -   Additional classes & ids are checked

## How To

### Install readabilitySAX

    npm install readabilitySAX

##### CLI

A command line interface (CLI) may be installed via

    npm install -g readabilitySAX

It's then available via

    readability <domain> [<format>]

To get this readme, just run

    readability https://github.com/FB55/readabilitySAX

The format is optional (it's either `text` or `html`, the default value is
`text`).

### Usage

##### Node

Just run `require("readabilitySAX")`. You'll get an object containing three
methods:

-   `Readability(settings)`: The readability constructor. It works as a handler
    for `htmlparser2`. Read more about it
    [in the wiki](https://github.com/FB55/readabilitySAX/wiki/The-Readability-constructor)!

-   `WritableStream(settings, cb)`: A constructor that unites `htmlparser2` and
    the `Readability` constructor. It's a writable stream, so simply `.write`
    all your data to it. Your callback will be called once `.end` was called.
    Bonus: You can also `.pipe` data into it!

-   `createWritableStream(settings, cb)`: Returns a new instance of the
    `WritableStream`. (It's a simple factory method.)

There are two methods available that are deprecated and **will be removed** in a
future version:

-   `get(link, [settings], callback)`: Gets a webpage and process it.

-   `process(data)`: Takes a string, runs readabilitySAX and returns the page.

**Please don't use those two methods anymore**. Streams are the way you should
build interfaces in node, and that's what I want encourage people to use.

##### Browsers

I started to implement simplified SAX-"parsers" for Rhino/YQL (using E4X) and
the browser (using the DOM) to increase the overall performance on those
platforms. The DOM version is inside the `/browsers` dir.

A demo of how to use readabilitySAX inside a browser may be found at
[jsFiddle](http://jsfiddle.net/pXqYR/embedded/). Some basic example files are
inside the `/browsers` directory.

##### YQL

A table using E4X-based events is available as the community table
`redabilitySAX`, as well as
[here](https://github.com/FB55/yql-tables/tree/master/readabilitySAX).

## Parsers (on node)

Most SAX parsers (as sax.js) fail when a document is malformed XML, even if it's
correct HTML. readabilitySAX should be used with
[htmlparser2](http://npm.im/htmlparser2), my fork of the `htmlparser`-module
(used by eg. `jsdom`), which corrects most faults. It's listed as a dependency,
so npm should install it with readabilitySAX.

## Performance

##### Speed

Using a package of 724 pages from [CleanEval](http://cleaneval.sigwac.org.uk)
(their website seems to be down, try to google it), readabilitySAX processed all
of them in 5768 ms, that's an average of 7.97 ms per page.

The benchmark was done using `tests/benchmark.js` on a MacBook (late 2010) and
is probably far from perfect.

Performance is the main goal of this project. The current speed should be good
enough to run readabilitySAX on a singe-threaded web server with an average
number of requests. That's an accomplishment!

##### Accuracy

The main goal of CleanEval is to evaluate the accuracy of an algorithm.

**_// TODO_**

## Todo

-   Add documentation & examples
-   Add support for URLs containing hash-bangs (`#!`)
-   Allow fetching articles with more than one page
-   Don't remove all images inside `<a>` tags
