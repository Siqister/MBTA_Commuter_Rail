var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    CartoDB = require('cartodb'),
    secret = require('./secret.js');

//CartoDB client
var client = new CartoDB({
   user: secret.USER,
   api_key: secret.API_KEY
});

//Data table specifics
var table = 'tm_world_borders_simpl_0_3';

//Configure express
app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.static(__dirname + '/app'));
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
    app.use(app.router);
});

app.get('/', function(req,res){
   res.sendfile(__dirname + '/app/index.html');
});

app.get('/world/:country', function(req,res){
    //client is a stream
    client.query('select * from {table}', {table: table, country: req.params.country});
    client.pipe(res);
});

server.listen(8080);
console.log('Server listening on 8080');
