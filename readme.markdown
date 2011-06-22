##readabilitySAX
###a fast [!!!] readability port

####History
I recently wanted to use [readability](http://code.google.com/p/arc90labs-readability/) in a node.js project. There are plenty of ports of readability to node (using jsdom), but they are pretty slow. I don't want to wait for a second until my node instance is ready to continue. I thought I could do better. So I did.

####About
This project is based upon [SAX.js by isaacs](https://github.com/isaacs/sax-js), but it may be used with any other javascript SAX parser. (Just throw some object into the process function, and you'll get the functions back required to make this work.)

In my tests, most pages were finished within 40ms (on node). It works on [YQL](http://developer.yahoo.com/yql), which may have interesting uses. And it works within a browser.

The basic extraction algorithm was completely ported (some adjustments were made, eg. `<article>` tags are recognized and gain a higher value), the only missing features are the following:

- If there is only one `<h2>` within the article, readability assumes it to be the heading of the article and removes it. This port don't (for now).
- The search for links to further pages of an article is missing, the correction of links needs the insertion of a function as an option. I'll have to come up with a different approach. (I you want to fix it: Commits are welcome!)
- The extraction of the title of the document isn't finished yet. That's a pretty easy task (it can be copy & pasted right out of readability, just some names have to be changed), therefore it will be implemented soon.

####TODO

- Links & the search for a title (see above).
- Structure code
- Add documentation & examples
- Optimise the performance:
- I started to implement simplified versions of sax.js for YQL (using E4X) and the browser (using the DOM) to increase the overall performance on those plattforms. Especially on YQL, the script requires to many instructions and fails.

Help is appreciated!

####HOWTO
Have a look at mkread.js and nodeServer.js (both files require node.js).