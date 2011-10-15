#readabilitySAX
a fast [!!!] & platform independent readability port

##History
I recently wanted to use [readability](http://code.google.com/p/arc90labs-readability/) in a node.js project. There are plenty of ports of readability to node (using jsdom, eg. [here](https://github.com/arrix/node-readability)), but they are pretty slow. I don't want to wait for more than a second until my node instance is ready to continue. I thought I could do better. So I did.

##About
This project was originally based upon [SAX.js by isaacs](https://github.com/isaacs/sax-js), but it may be used with any other javascript SAX parser. (Just throw some random object into the process function, and you'll get the functions required to make this work attached.)

In my tests, most pages were finished within 40ms (on node). It works with Rhino, so it runs on [YQL](http://developer.yahoo.com/yql "Yahoo! Query Language"), which may have interesting uses. And it works within a browser.

I started to implement simplified versions of sax.js for YQL (using E4X) and the browser (using the DOM) to increase the overall performance on those plattforms. Especially on YQL, sax.js requires to many instructions and fails after some ms. A table using E4X-based events is available as the community table `redabilitySAX`, as well as [here](https://github.com/FB55/yql-tables/tree/master/readability).

The basic extraction algorithm was completely ported (some adjustments were made, eg. `<article>` tags are recognized and gain a higher value), the only missing features are the following:

- If there is only one `<h2>` within the article, readability assumes it to be the heading of the article and removes it. This port doesn't.
- The correction of links needs the insertion of a function as an option. I'll have to come up with a different approach. (If you want to fix it: Commits are welcome!)
- I probably forgot something […]

##HOWTO
###Installing readabilitySAX
This module is available on `npm` as `readabilitySAX`. Install it via `npm install readabilitySAX`.

###Usage
The easiest way of using this script is via the interface provided by `getReadableContent.js`. Just include it via `require("readabilitySAX/node_examples/getReadableContent.js")` (which finds readabilitySAX inside of your `node_modules`-directory) and use the `.get()` and `.process()`-methods.

A demo of how to use readabilitySAX inside a browser may be found at [jsFiddle](http://jsfiddle.net/DYE9k/embedded/). Some basic example files are inside the `browsers` directory.

###Notes
Most SAX parsers (as sax.js) fail when a document is malformed XML, even if it's correct HTML. readabilitySAX should be used with `htmlparser2`, my fork of the `htmlparser`-module used by eg. `jsdom`, which corrects most faults. It's listed as a dependency, so npm should install it whith readabilitySAX.

The original Readability checks if (enough) content was found and tries again to find content with more parts of the page available. This behavor is included within `getReadableContent`, otherwise you would need to code it yourself.

##Performance
Using a (jsdom cleaned) package of 620 pages from [CleanEval](http://cleaneval.sigwac.org.uk/), readabilitySAX processed all of them in 10874ms, that's an average of 17.5387ms per page. The benchmark was done using `benchmark.js` and is probably far from perfect.

##TODO

- Links and removal of h2s (see above)
- Add documentation & examples
- Optimise the performance (always)