var readability =  require('./getreadablecontent'),
	url = require("url"),
	http = require("http");

http.createServer(function(request, response){
  if(request.url === "/"){ response.end("{err:'URL NEEDED!'}"); return; }
  readability.get(request.url.substring(1), function(ret){
    response.writeHead(200, {"content-type":"application/json"});
    response.end(JSON.stringify(ret));
  });
}).listen(80);