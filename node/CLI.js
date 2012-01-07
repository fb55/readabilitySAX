#!/usr/bin/env node

if(process.argv.length < 3 || !/^https?:\/\//.test(process.argv[2])){
	console.log("Usage:", "readability", "http://domain.tld/sub");
}
else require("../").get(process.argv[2], console.log);