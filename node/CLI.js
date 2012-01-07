#!/usr/bin/env node

if(process.argv.length < 2 || !/^https?:\/\//.test(process.argv[1])){
	console.log("Usage:", "readability", "http://domain.tld/sub");
}
else require("../").get(process.argv[1], console.log);