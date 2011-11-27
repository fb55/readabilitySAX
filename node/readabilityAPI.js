//an example of how to implement a webserver

var readability =  require("./index.js"),
	url = require("url"),
	http = require("http");

http.createServer(function(request, response){
  if(request.url === "/"){ response.end("{err:'URL NEEDED!'}"); return; }
  readability.get(request.url.substr(1), function(ret){
    response.writeHead(200, {"content-type":"application/json"});
    response.end(JSON.stringify(ret));
  });
}).listen(process.argv.length > 2 ? process.argv[2] : 80);