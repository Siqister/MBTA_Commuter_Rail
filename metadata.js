//This module generates station metadata from results scraped from mbta.com
//Data output: stations_metadata.json

var fs = require('fs');

var uniqueStations = []; //flat array of unique stations

fs.readFile('app/data_output/stations.json', function(err,data){
    var allLines = JSON.parse(data); //all station data
    console.log(allLines.length);

    var postPattern = /[0-9][0-9][0-9][0-9][0-9]/;

    allLines.forEach(function(line){
        //id of the line
        var line_id = line.line_id;

        line.stations.forEach(function(station){

            var post = postPattern.test(station.address)? (postPattern.exec(station.address))[0] : null;

            //for each station, decide if it's already in the allStations array
            var duplicateStation = uniqueStations.filter(function(elem){
               return elem.id === station.id;
            });
            if(duplicateStation.length === 0){
                uniqueStations.push({
                    id: station.id,
                    location: station.location,
                    address: station.address,
                    p_code: post,
                    lines: [line_id]
                });
            }else{
                //duplicateStation exists
                duplicateStation[0].lines.push(line_id);
            }

        });
    });

    console.log(uniqueStations.length);

    writeFile();
});

function writeFile(){

    fs.writeFile('app/data_output/stations_metadata.json', JSON.stringify(uniqueStations, null, 4), function (fileErr) {
        if (fileErr) throw fileErr;
        console.log("File write completed");
    });
}