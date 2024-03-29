const assert = require("assert");
const { Parser } = require("htmlparser2");
const Readability = require("../readabilitySAX");
const file = require("fs").readFileSync(`${__dirname}/testpage.html`, "utf8");

const expectedLinks = 2;

const expectedUrl = {
    protocol: "http:",
    domain: "foo.bar",
    path: ["this.2", "is", "a", "long", "path"],
    full: "http://foo.bar/this.2/is/a/long/path/index?isnt=it",
};

const expectedData = {
    title: "Realtime Performance Visualizations using Node.js",
    nextPage: "http://howtonode.org/heat-tracer/dummy/page/2",
    textLength: 11668,
    score: 83,
    html: "<a href=\"http://howtonode.org/243bfe84f43affd3244e1828d90a8dca7fcc34c4/heat-tracer\">Static Version</a><p>This article outlines how to create a realtime heatmap of your syscall latency using HTML5, some great node modules, and DTrace. It was inspired by talk that Bryan Cantrill and Brendan Greg gave on Joyent's cool cloud analytics tools. While specific, the code provided could easily be adapted to provide a heatmap of any type of aggregation Dtrace is capable of providing. </p>\n\n<h2>System Requirements</h2>\n\n<p>First thing's first, you're going to need a system with DTrace. This likely means Solaris (or one of its decedents), OS X, or a BSD variant.  There doesn't appear to be Dtrace available for Linux. </p>\n\n<h2>Security</h2>\n\n<p>Secondly, please be aware that at the time of writing the demo code contains a fairly substantial secruity vulnerabilty. Namely the d script is sent from the client with no authentication what so ever. If you bind to localhost this shouldn't be a big deal for a demo. Time permitting I intend to clean up the code.  </p>\n\n<h2>Dependencies</h2>\n\n<p>For this tutorial you'll also need:</p>\n\n<pre><code>node - http://nodejs.org/#download (duh)<br/>npm - https://github.com/isaacs/npm (makes installing modules a breeze)<br/>node-libdtrace - https://github.com/bcantrill/node-libdtrace (provides dtrace functionality)<br/>Socket.IO - 'npm install socket.io' (web sockets made easy)<br/></code></pre>\n\n<h2>Server</h2>\n\n<p>Now we're ready to start writing our web server: </p>\n\n<p><embed src=\"http://youtube.com/\"></embed> This is just a test embed! </p>\n\n<div><a href=\"http://howtonode.org/heat-tracer/heat-tracer/heat_tracer.js\">heat_tracer.js</a><pre><code>var http = require('http');<br/>var libdtrace = require('libdtrace');<br/>var io = require('socket.io');<br/>var express = require('express');</p><p>/* create our express server and prepare to serve javascript files in ./public<br/>*/<br/>var app = express.createServer();<br/>app.configure(function(){<br/>&nbsp; &nbsp; app.use(express.staticProvider(__dirname + '/public'));<br/>&nbsp; &nbsp; });</p><p>/* Before we go any further we must realize that each time a user connects we're going to want to<br/>&nbsp; &nbsp;them send them dtrace aggregation every second. We can do so using 'setInterval', but we must<br/>&nbsp; &nbsp;keep track of both the intervals we set and the dtrace consumers that are created as we'll need<br/>&nbsp; &nbsp;them later when the client disconnects.<br/>*/<br/>var interval_id_by_session_id = {};<br/>var dtp_by_session_id = {};</p><p>/* In order to effecienctly send packets we're going to use the Socket.IO library which seemlessly<br/>&nbsp; &nbsp;integrates with express.<br/>*/<br/>var websocket_server = io.listen(app);</p><p>/* Now that we have a web socket server, we need to create a handler for connection events. These<br/>&nbsp; &nbsp;events represet a client connecting to our server */<br/>websocket_server.on('connection', function(socket) {</p><p>&nbsp; &nbsp; /* Like the web server object, we must also define handlers for various socket events that<br/>&nbsp; &nbsp; &nbsp; &nbsp;will happen during the lifetime of the connection. These will define how we interact with<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;the client. The first is a message event which occurs when the client sends something to<br/>&nbsp; &nbsp; &nbsp; &nbsp;the server. */<br/>&nbsp; &nbsp; socket.on( 'message', function(message) {<br/>&nbsp; &nbsp; &nbsp; &nbsp; /* The only message the client ever sends will be sent right after connecting.<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;So it will happen only once during the lifetime of a socket. This message also<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;contains a d script which defines an agregation to walk.<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;*/<br/>&nbsp; &nbsp; &nbsp; &nbsp; var dtp = new libdtrace.Consumer();<br/>&nbsp; &nbsp; &nbsp; &nbsp; var dscript = message['dscript'];<br/>&nbsp; &nbsp; &nbsp; &nbsp; console.log( dscript );<br/>&nbsp; &nbsp; &nbsp; &nbsp; dtp.strcompile(dscript);<br/>&nbsp; &nbsp; &nbsp; &nbsp; dtp.go();<br/>&nbsp; &nbsp; &nbsp; &nbsp; dtp_by_session_id[socket.sessionId] = dtp;</p><p>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;/* All that's left to do is send the aggration data from the dscript. &nbsp;*/<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;interval_id_by_session_id[socket.sessionId] = setInterval(function () {<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;var aggdata = {};<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;try {<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;dtp.aggwalk(function (id, key, val) {<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;for( index in val ) {<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;/* console.log( 'key: ' + key + ', interval: ' +<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; val[index][0][0] + '-' + val[index][0][1], ', count ' + val[index][1] ); */</p><p>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; aggdata[key] = val;<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; }<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; } );<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; socket.send( aggdata );<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; } catch( err ) {<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; console.log(err);<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; }</p><p>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; }, &nbsp;1001 );<br/>&nbsp; &nbsp; &nbsp; &nbsp; } );</p><p>&nbsp; &nbsp; /* Not so fast. If a client disconnects we don't want their respective dtrace consumer to<br/>&nbsp; &nbsp; &nbsp; &nbsp;keep collecting data any more. We also don't want to try to keep sending anything to them<br/>&nbsp; &nbsp; &nbsp; &nbsp;period. So clean up. */<br/>&nbsp; &nbsp; socket.on('disconnect', function(){<br/>&nbsp; &nbsp; &nbsp; &nbsp; clearInterval(clearInterval(interval_id_by_session_id[socket.sessionId]));<br/>&nbsp; &nbsp; &nbsp; &nbsp; var dtp = dtp_by_session_id[socket.sessionId];<br/>&nbsp; &nbsp; &nbsp; &nbsp; delete dtp_by_session_id[socket.sessionId];<br/>&nbsp; &nbsp; &nbsp; &nbsp; dtp.stop();<br/>&nbsp; &nbsp; &nbsp; &nbsp; console.log('disconnected');<br/>&nbsp; &nbsp; &nbsp; &nbsp; });</p><p>&nbsp; &nbsp; } );</p><p>app.listen(80);</code></pre></div>\n\n<h2>Client</h2>\n\n<p>In order to display our heatmap, we're going to need some basic HTML with a canvas element:</p>\n\n<div><a href=\"http://howtonode.org/heat-tracer/heat-tracer/public/heat_tracer.html\">public/heat_tracer.html</a><pre><code>&lt;html&gt;<br/>&lt;head&gt;<br/>&lt;script src=\"http://localhost/socket.io/socket.io.js\"&gt;&lt;/script&gt;<br/>&lt;script src=\"http://localhost/heat_tracer_client.js\"&gt;&lt;/script&gt;<br/>&lt;/head&gt;<br/>&lt;body onLoad='heat_tracer()'&gt;<br/>&lt;canvas id='canvas' width='1024' height='512'&gt;&lt;/canvas&gt;<br/>&lt;/body&gt;<br/>&lt;/html&gt;</code></pre></div>\n\n<p>Finally the JavaScript client which translates the raw  streaming data into pretty picture:</p>\n\n<div><a href=\"http://howtonode.org/heat-tracer/heat-tracer/public/heat_tracer_client.js\">public/heat_tracer_client.js</a><pre><code>/* On load we create our web socket (or flash socket if your browser doesn't support it ) and<br/>&nbsp; &nbsp;send the d script we wish to be tracing. This extremely powerful and *insecure*. */<br/>function heat_tracer() {</p><p>&nbsp; &nbsp; //Global vars<br/>&nbsp; &nbsp; setup();</p><p>&nbsp; &nbsp; var socket = new io.Socket('localhost'); //connect to localhost presently<br/>&nbsp; &nbsp; socket.connect();</p><p>&nbsp; &nbsp; socket.on('connect', function(){<br/>&nbsp; &nbsp; &nbsp; &nbsp; console.log('on connection');<br/>&nbsp; &nbsp; &nbsp; &nbsp; var dscript = \"syscall:::entry\\n{\\nself-&gt;syscall_entry_ts[probefunc] = vtimestamp;\\n}\\nsyscall:::return\\n/self-&gt;syscall_entry_ts[probefunc]/\\n{\\n\\n@time[probefunc] = lquantize((vtimestamp - self-&gt;syscall_entry_ts[probefunc] ) / 1000, 0, 63, 2);\\nself-&gt;syscall_entry_ts[probefunc] = 0;\\n}\";<br/>&nbsp; &nbsp; &nbsp; &nbsp; socket.send( { 'dscript' : dscript } );<br/>&nbsp; &nbsp; });</p><p>&nbsp; &nbsp; /* The only messages we recieve should contain contain the dtrace aggregation data we requested<br/>&nbsp; &nbsp; &nbsp; &nbsp;on connection. */<br/>&nbsp; &nbsp; socket.on('message', function(message){<br/>&nbsp; &nbsp; &nbsp; &nbsp; //console.log( message );<br/>&nbsp; &nbsp; &nbsp; &nbsp; draw(message);</p><p>&nbsp; &nbsp; &nbsp; &nbsp; /* for ( key in message ) {<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;val = message[key];<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;console.log( 'key: ' + key + ', interval: ' + val[0][0] + '-' + val[0][1], ', count ' + val[1] );<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;}<br/>&nbsp; &nbsp; &nbsp; &nbsp; */<br/>&nbsp; &nbsp; });</p><p>&nbsp; &nbsp; socket.on('disconnect', function(){<br/>&nbsp; &nbsp; });</p><p>}</p><p>/* Take the aggregation data and update the heatmap */<br/>function draw(message) {</p><p>&nbsp; &nbsp; /* Latest data goes in the right most column, initialize it */<br/>&nbsp; &nbsp; var syscalls_by_latency = [];<br/>&nbsp; &nbsp; for ( var index = 0; index &lt; 32; index++ ) {<br/>&nbsp; &nbsp; syscalls_by_latency[index] = 0;<br/>&nbsp; &nbsp; }</p><p>&nbsp; &nbsp; /* Presently we have the latency for each system call quantized in our message. Merge the data<br/>&nbsp; &nbsp; &nbsp; &nbsp;such that we have all the system call latency quantized together. This gives us the number<br/>&nbsp; &nbsp; &nbsp; &nbsp;of syscalls made with latencies in each particular band. */<br/>&nbsp; &nbsp; for ( var syscall in message ) {<br/>&nbsp; &nbsp; var val = message[syscall];<br/>&nbsp; &nbsp; for ( result_index in val ) {<br/>&nbsp; &nbsp; &nbsp; &nbsp; var latency_start = val[result_index][0][0];<br/>&nbsp; &nbsp; &nbsp; &nbsp; var count = &nbsp;val[result_index][1];<br/>&nbsp; &nbsp; &nbsp; &nbsp; /* The d script we're using lquantizes from 0 to 63 in steps of two. So dividing by 2<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;tells us which row this result belongs in */<br/>&nbsp; &nbsp; &nbsp; &nbsp; syscalls_by_latency[Math.floor(latency_start/2)] += count;<br/>&nbsp; &nbsp; }<br/>&nbsp; &nbsp; }</p><p>&nbsp; &nbsp; /* We just created a new column, shift the console to the left and add it. */<br/>&nbsp; &nbsp; console_columns.shift();<br/>&nbsp; &nbsp; console_columns.push(syscalls_by_latency);<br/>&nbsp; &nbsp; drawArray(console_columns);<br/>}</p><p>/* Draw the columns and rows that map up the heatmap on to the canvas element */<br/>function drawArray(console_columns) {<br/>&nbsp; &nbsp; var canvas = document.getElementById('canvas');<br/>&nbsp; &nbsp; if (canvas.getContext) {<br/>&nbsp; &nbsp; var ctx = canvas.getContext('2d');<br/>&nbsp; &nbsp; for ( var column_index in console_columns ) {<br/>&nbsp; &nbsp; &nbsp; &nbsp; var column = console_columns[column_index];<br/>&nbsp; &nbsp; &nbsp; &nbsp; for ( var entry_index in column ) {<br/>&nbsp; &nbsp; &nbsp; &nbsp; entry = column[entry_index];</p><p>&nbsp; &nbsp; &nbsp; &nbsp; /* We're using a logarithmic scale for the brightness. This was all arrived at by<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;trial and error and found to work well on my Mac. &nbsp;In the future this<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;could all be adjustable with controls */<br/>&nbsp; &nbsp; &nbsp; &nbsp; var red_value = 0;<br/>&nbsp; &nbsp; &nbsp; &nbsp; if ( entry != 0 ) {<br/>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; red_value = Math.floor(Math.log(entry)/Math.log(2));<br/>&nbsp; &nbsp; &nbsp; &nbsp; }<br/>&nbsp; &nbsp; &nbsp; &nbsp; //console.log(red_value);<br/>&nbsp; &nbsp; &nbsp; &nbsp; ctx.fillStyle = 'rgb(' + (red_value * 25) + ',0,0)';<br/>&nbsp; &nbsp; &nbsp; &nbsp; ctx.fillRect(column_index*16, 496-(entry_index*16), 16, 16);<br/>&nbsp; &nbsp; &nbsp; &nbsp; }<br/>&nbsp; &nbsp; }<br/>&nbsp; &nbsp; }<br/>}</p><p>/* The heatmap is is really a 64x32 grid. Initialize the array which contains the grid data. */<br/>function setup() {<br/>&nbsp; &nbsp; console_columns = [];</p><p>&nbsp; &nbsp; for ( var column_index = 0; column_index &lt; 64; column_index++ ) {<br/>&nbsp; &nbsp; var column = [];<br/>&nbsp; &nbsp; for ( var entry_index = 0; entry_index &lt; 32; entry_index++ ) {<br/>&nbsp; &nbsp; &nbsp; &nbsp; column[entry_index] = 0;<br/>&nbsp; &nbsp; }<br/>&nbsp; &nbsp; console_columns.push(column);<br/>&nbsp; &nbsp; }</p><p>}</code></pre></div>\n\n<h2>Run It!</h2>\n\n<p>Run Heat Tacer with the following. Note, sudo is required by dtrace as it does kernal magic.</p>\n\n<pre><code>sudo node heat_tracer.js<br/></code></pre>\n\n<p>If all goes well you should see something a moving version of something like the image below.</p>\n\n<blockquote>\n  <p><img src=\"http://howtonode.org/heat-tracer/heat_tracer.png\" alt=\"Alt value of image\"></img> </p>\n</blockquote>\n\n<h2>Contribute</h2>\n\n<p>You can find the latest version of Heat Tracer <a href=\"https://github.com/gflarity/Heat-Tracer\">here</a>. It is my hope that this article will provide the ground work for a much more abitious performance analytics project. If you're interested in contributing please let me know.</p>\n\n<h2>Further Research</h2>\n\n<p>More information about Bryan and Brendan's demo can be found <a href=\"http://dtrace.org/blogs/brendan/2011/01/24/cloud-analytics-first-video/\">here</a>.</p>\n\n<p>Socket.IO can be found <a href=\"http://socket.io/\">here</a>.</p><hr/>\n\n<a href=\"http://disqus.com/forums/howtonodeorg/?url=ref\">View the discussion thread.</a>",
};

const readable = new Readability({
    pageURL: "http://howtonode.org/heat-tracer/",
    resolvePaths: true,
});
const parser = new Parser(readable);

parser.parseComplete(file);

const article = readable.getArticle();

assert.strictEqual(
    article.title,
    expectedData.title,
    "didn't get expected title!"
);
assert.strictEqual(
    article.nextPage,
    expectedData.nextPage,
    "didn't get expected nextPage!"
);
assert.strictEqual(
    article.textLength,
    expectedData.textLength,
    "didn't get expected textLength!"
);
assert.strictEqual(
    article.score,
    expectedData.score,
    "didn't get expected score!"
);
assert.strictEqual(
    article.html,
    expectedData.html,
    "didn't get expected html!"
);

assert.strictEqual(
    require("util").inspect(readable._currentElement, false, 1 / 0).length,
    245663,
    "tree had false size!"
);
assert.strictEqual(
    Object.keys(readable._scannedLinks).length,
    expectedLinks,
    "wrong number of links!"
);

testURL();

console.log("Passed!");

function testURL() {
    const readable = new Readability({
        pageURL: "http://foo.bar/this.2/is/a/long/path/index?isnt=it",
        resolvePaths: true,
    });

    assert.strictEqual(
        JSON.stringify(readable._url),
        JSON.stringify(expectedUrl),
        "wrong url"
    );
    assert.strictEqual(
        readable._baseURL,
        "http://foo.bar/this.2/is/a/long/path",
        "wrong base"
    );
    assert.strictEqual(
        readable._convertLinks("../asdf/foo/"),
        "http://foo.bar/this.2/is/a/long/asdf/foo/",
        "link1 wasn't resolved!"
    );
    assert.strictEqual(
        readable._convertLinks("/asdf/foo/"),
        "http://foo.bar/asdf/foo/",
        "link2 wasn't resolved!"
    );
    assert.strictEqual(
        readable._convertLinks("foo/"),
        "http://foo.bar/this.2/is/a/long/path/foo/",
        "link3 wasn't resolved!"
    );
}
