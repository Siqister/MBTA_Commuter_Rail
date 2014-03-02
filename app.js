var express = require('express'),
    app = express(),
    server = require('http').createServer(app);

//Configure server
app.configure(function () {
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.static(__dirname + '/app'));
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
    app.use(app.router);
});

//app routes
app.get('/', function(req,res){
    res.sendfile(__dirname + '/app/index.html');
});

app.listen(8080);
console.log("Server listening on port 8080");