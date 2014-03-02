//Module designed to work with web_scraping

var request = require('request'),
    util = require('util'),
    gmaps = require('googlemaps'),
    cheerio = require('cheerio');

var st = ['Worcester','North Station'];

var mbta_url_root = "http://www.mbta.com",
    google_api_root = "https://maps.googleapis.com/maps/api/geocode/json?sensor=false&bounds=41.767695,-72.163696|42.958307,-70.257568&key=AIzaSyCCS8Jy5KE61FDXSKFlM0fRbpvB1WhjNHU";

var geocode = function(stations, callBack){
    //stations => array of station JSON objects

    var total_num = stations.length,
        requests_completed = 0;

    for (i in stations){
        var url = mbta_url_root + stations[i].link;

        request(url, (function(st){return function(err,res,body){
            //st ==> JSON object rep. individual stations
           if(err)
               throw err;

           $ = cheerio.load(body);

           st.address = $('p.stationAddress').text();

            //Now with the station address, issue a second request for Google Geocoding api
            var google_url = google_api_root + "&address=" + st.address;



            request({url:google_url, json:true}, (function(st1){ return function(err1,res1,body1){
                requests_completed += 1;

                if(err1)
                    throw err1;

                if(body1.status=='OK'){
                    st1.location = body1.results[0].geometry.location;
                }else{
                    st1.location = body1;
                }

                //when all requests completed, trigger callBack();
                if(requests_completed == total_num)
                    callBack();

            };})(st));



        };})(stations[i]));
    }
}

exports.geocode = geocode;