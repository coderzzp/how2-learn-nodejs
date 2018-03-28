const http = require('http')
var server = http.createServer();
server.listen(0);
server.on('listening', function() { 
	var port = server.address().port;
	console.log(port);
})