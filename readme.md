#readabilitySAX
a fast and platform independent readability port

##About
One day, I wanted to use [readability](http://code.google.com/p/arc90labs-readability/) for a node.js project. There are plenty of ports of readability to node (using jsdom, e.g. [that one](https://github.com/arrix/node-readability)), but they are pretty slow. I don't want to wait for more than a second (literally) until my node instance is ready to continue. So I started this project, porting the code to a SAX parser.

The basic extraction algorithm was completely ported, some adjustments were made, eg. `<article>` tags are recognized and gain a higher value. And it performs great.

In my tests, most pages, even large ones, were finished within 20ms (on node, see below for more information). It works with Rhino, so it runs on [YQL](http://developer.yahoo.com/yql "Yahoo! Query Language"), which may have interesting uses. And it works within a browser.

The only missing features are the following:

* If there is only one `<h2>` within the article, readability assumes it to be the heading of the article and removes it. This port doesn't.

##HowTo
###Installing readabilitySAX
This module is available on `npm` as `readabilitySAX`. Just run 

    npm install readabilitySAX

###Usage
#####Node
Just run `require("readabilitySAX")`. You'll get an object containing three methods:

* `get(link, callback)`: Gets a webpage and process it.
* `process(data)`: Takes a string, runs readabilitySAX and returns the page.
* `Readability(settings)`: The readability object. It works as a handler for `htmlparser2`.

#####Browsers

I started to implement simplified SAX-"parsers" for Rhino/YQL (using E4X) and the browser (using the DOM) to increase the overall performance on those platforms. The DOM version is inside the `/browsers` dir.

A demo of how to use readabilitySAX inside a browser may be found at [jsFiddle](http://jsfiddle.net/pXqYR/embedded/). Some basic example files are inside the `/browsers` directory.

#####YQL

A table using E4X-based events is available as the community table `redabilitySAX`, as well as [here](https://github.com/FB55/yql-tables/tree/master/readabilitySAX).

##Notes
Most SAX parsers (as sax.js) fail when a document is malformed XML, even if it's correct HTML. readabilitySAX should be used with [htmlparser2](https://github.com/FB55/node-htmlparser), my fork of the `htmlparser`-module (used by eg. `jsdom`), which corrects most faults. It's listed as a dependency, so npm should install it with readabilitySAX.

##Performance
Using a package of 680 pages from [CleanEval](http://cleaneval.sigwac.org.uk) (their website seems to be down, try to google it), readabilitySAX processed all of them in 6667 ms, that's an average of 9.8 ms per page.

The benchmark was done using `tests/benchmark.js` on a MacBook (late 2010) and is probably far from perfect.

Performance is the main goal of this project. The current speed should be good enough to run readabilitySAX on a singe-threaded web server. That's an accomplishment!

##Todo

- Removal of h2s (see above)
- Add documentation & examples
- Optimize the performance (always)