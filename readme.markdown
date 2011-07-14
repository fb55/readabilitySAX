#readabilitySAX
##a fast [!!!] & platform independent readability port

###History
I recently wanted to use [readability](http://code.google.com/p/arc90labs-readability/) in a node.js project. There are plenty of ports of readability to node (using jsdom), but they are pretty slow. I don't want to wait for a second until my node instance is ready to continue. I thought I could do better. So I did.

###About
This project is based upon [SAX.js by isaacs](https://github.com/isaacs/sax-js), but it may be used with any other javascript SAX parser. (Just throw some random object into the process function, and you'll get the functions required to make this work attached.)

In my tests, most pages were finished within 40ms (on node). It works with Rhino, so it runs on [YQL](http://developer.yahoo.com/yql "Yahoo! Query Language"), which may have interesting uses. And it works within a browser.

I started to implement simplified versions of sax.js for YQL (using E4X) and the browser (using the DOM) to increase the overall performance on those plattforms. Especially on YQL, sax.js requires to many instructions and fails after some ms. I opened a pull request for readabilitySAX as a YQL table, if you want to use it right now, it may be found [here](https://github.com/FB55/yql-tables/tree/master/readability).

The basic extraction algorithm was completely ported (some adjustments were made, eg. `<article>` tags are recognized and gain a higher value), the only missing features are the following:

- If there is only one `<h2>` within the article, readability assumes it to be the heading of the article and removes it. This port doesn't (for now).
- The search for links to further pages of an article is missing, the correction of links needs the insertion of a function as an option. I'll have to come up with a different approach. (If you want to fix it: Commits are welcome!)
- Readability offers to move links to the footnotes. You may do this by adding a custom function for converting links, but native support would be nice.

###TODO

- Links and removal of h2s (see above)
- Add documentation & examples
- Optimise the performance (always)

###HOWTO
Have a look at the "node_examples" directory. The `getReadableContent.js`-file is a good example of how to use readabilitySAX.

*Note*
Readability checks if (enough) content was found and tries again to find content with more parts of the page available. You may do this as well, but I built this with the idea of streaming data in mind. Therefore, it is your part to cache the content you need and to check if it's enough. See `getReadableContent.js` for an example of how to do this.