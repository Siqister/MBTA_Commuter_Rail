var request = require('request'),
    cheerio = require('cheerio'),
    fs = require('fs'),
    parseXML = require('xml2js').parseString;

//Global variables for web scraping
var zwsid = 'X1-ZWz1b9nk49hz4b_5f91a',
    url_root = "http://www.zillow.com/webservice/GetDemographics.htm?zws-id=" + zwsid + "&zip=",
    requests_completed = 0,
    requests_made = 0,
    num_requests,
    stations;

var output = [];

fs.readFile('./app/data_output/stations_metadata.json', function(err, data){
    stations = JSON.parse(data);
    num_requests = stations.length;
    console.log(num_requests);

    makeRequest(0);
});

function makeRequest(index){
    requests_made ++;

    var station = stations[index];
    var url = url_root + station.p_code;

    request(url, (function(station){return function(err, res, body){
        if(err){
            throw err;
        }

        //parsing body XML
        var result = parseXML(body, function(err1, result){
            console.log(result["Demographics:demographics"].message[0].text[0]);
            console.log(station.id);

            var data = result["Demographics:demographics"].response[0].pages[0].page[0].tables[0].table[0].data[0].attribute;


            //problem is that .zip value might not exist
            var value_index = data[0].values[0].zip? data[0].values[0].zip[0].value[0]._ : 0,
                psf = data[8].values[0].zip[0].value[0]._ ? data[8].values[0].zip[0].value[0]._ : 0;

            output.push({
                id: station.id,
                zip: station.p_code,
                value_index: value_index,
                psf: psf
            });

            requests_completed ++;

            if(requests_completed === num_requests){
                outputFile();
            }
        }); //end of parseXML
    }; })(station)
    ); //end of request

    if(stations[index+1]){
        if(requests_made%15 === 0){
            console.log("Wait 5 seconds for the next batch of requests");
            setTimeout(makeRequest, 5000, (index+1));
        }else{
            makeRequest(index+1);
        }
    }
};

function outputFile(){
    console.log('Rquests completed: ' + requests_completed);

    fs.writeFile('./app/data_output/stations_zillow.json', JSON.stringify(output, null, 4), function (fileErr) {
        if (fileErr) throw fileErr;
        console.log("File write completed");
    });
}