var sax =  require('./sax.js'),
	readability = require("./readabilitySAX.js"),
	url = require("url"),
	http = require("http");

http.createServer(function(request, response){
  if(request.url === "/"){ response.end("{err:'URL NEEDED!'}"); return; }
  var parser = sax.parser(false, {	
	  trim : true,
	  normalize: true,
	  lowercasetags : true
  });
  
  var link = url.parse(request.url.substring(1)),
	  client = require("http").createClient(80, link.host),
	  req = client.request("GET", link.href, { 'host': link.host, 'accept':"text/html" });
  
  var readable = new readability.process(parser, {
	  convertLinks: function(a){
		  return url.resolve(link, a);
	  },
	  pageURL: url.format(link)
  });
  
  req.addListener("response", function(connection){
	  connection.addListener("data", function(chunk){
		  parser.write(chunk.toString("utf8"));
	  });
	  connection.addListener("end", function(){
		  parser.close();
		  response.writeHead(200,{"Content-type": "application/json"});
	response.end(JSON.stringify(readable.getArticle()));
	  });
  });
  req.end();
}).listen(80);