#readabilitySAX
a fast and platform independent readability port

##About
I recently wanted to use [readability](http://code.google.com/p/arc90labs-readability/) in a node.js project. There are plenty of ports of readability to node (using jsdom, e.g. [here](https://github.com/arrix/node-readability)), but they are pretty slow. I don't want to wait for more than a second (literally) until my node instance is ready to continue. I thought I could do better. So I did.

This project was originally based upon [SAX.js by isaacs](https://github.com/isaacs/sax-js), but it may be used with any other JS SAX parser. (Just give all methods starting with `on` to the parser.)

In my tests, most pages were finished within 40ms (on node). It works with Rhino, so it runs on [YQL](http://developer.yahoo.com/yql "Yahoo! Query Language"), which may have interesting uses. And it works within a browser.

I started to implement simplified versions of sax.js for YQL (using E4X) and the browser (using the DOM) to increase the overall performance on those platforms.

The basic extraction algorithm was completely ported (some adjustments were made, eg. `<article>` tags are recognized and gain a higher value), the only missing features are the following:

* If there is only one `<h2>` within the article, readability assumes it to be the heading of the article and removes it. This port doesn't.
* I probably forgot something […]

##HowTo
###Installing readabilitySAX
This module is available on `npm` as `readabilitySAX`. Just run 

    npm install readabilitySAX

###Usage
#####Node
Just run `require("readabilitySAX")`. You'll get three methods:

* `get(link, callback)`: Gets a webpage and process it.
* `process(data)`: Takes a string, runs readabilitySAX and returns the page.
* `Readability(settings)`: The readability object. It works as a handler for `htmlparser2`.

#####Browsers

A demo of how to use readabilitySAX inside a browser may be found at [jsFiddle](http://jsfiddle.net/pXqYR/embedded/). Some basic example files are inside the `/browsers` directory.

#####YQL

A table using E4X-based events is available as the community table `redabilitySAX`, as well as [here](https://github.com/FB55/yql-tables/tree/master/readability).

##Notes
Most SAX parsers (as sax.js) fail when a document is malformed XML, even if it's correct HTML. readabilitySAX should be used with [htmlparser2](https://github.com/FB55/node-htmlparser), my fork of the `htmlparser`-module (used by eg. `jsdom`), which corrects most faults. It's listed as a dependency, so npm should install it with readabilitySAX.

##Performance
Using a (jsdom cleaned) package of 620 pages from [CleanEval](http://cleaneval.sigwac.org.uk/), readabilitySAX processed all of them in 10874ms, that's an average of 17.5387ms per page. The benchmark was done using `benchmark.js` and is probably far from perfect.

##ToDo

- Links and removal of h2s (see above)
- Add documentation & examples
- Optimize the performance (always)