var request = require('request'),
    util = require('util'),
    gmaps = require('googlemaps'),
    express = require('express'),
    app = express(),
    server = require('http').createServer(app);

//bootstrap data
var cities = ['Lawrence,MA', 'Lowell,MA', 'Gloucester,MA', 'Providence,RI', 'Worcester,MA'];
var time = Math.round(Date.now()/1000);

//configure server
app.configure(function(){
   app.use(express.methodOverride());
   app.use(express.bodyParser());
   //app.use(express.static(__dirname + "/gmaps"));
   app.use(app.router);
});

app.get('/:origin/:mode', function(req,res){

    var url_root = 'http://maps.googleapis.com/maps/api/directions/json?'
                    + 'origin=' + req.params.origin
                    + '&sensor=false'
                    + '&mode=' + req.params.mode;
    if(req.params.mode == 'transit'){ url_root = url_root + '&departure_time='+time; }

    var response = {},
        requests = cities.length,
        requests_completed = 0;

    response.origin = {};
    response.destinations = [];

    for (i in cities){
        var url = url_root + "&destination=" + cities[i];

        request({url:url, json:true}, function(err,apiRes,body){
            requests_completed += 1;

            if(err)
                throw err;

            if(body.routes[0] && body.status == "OK"){
                var leg = body.routes[0].legs[0];

                response.origin.id = req.params.origin;
                response.origin.address = leg.start_address;
                response.origin.coord = leg.start_location;

                var dest = {};
                dest.address = leg.end_address;
                dest.coord = leg.end_location;
                dest.time = leg.duration.value;
                dest.trip_desc = leg.steps;

                response.destinations.push(dest);
            }

            if(requests_completed == requests){
                console.log("All requests completed: " + requests_completed);
                res.json(response);
            }
        });

    }
});

app.listen(8080);
console.log("Server listening on port 8080");