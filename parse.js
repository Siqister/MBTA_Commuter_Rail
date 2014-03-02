var fs = require('fs');

var allLines, metadata, stopping_patterns, zillow;

var links = []; //list of links to draw
var uniqueStations = []; //flat array of unique stations

fs.readFile('app/data_output/stations.json', function(err,data){
    allLines = JSON.parse(data);

    fs.readFile('app/data_output/stations_metadata.json', function(err1,data1){
        metadata = JSON.parse(data1);

        fs.readFile('./app/data_output/stopping_pattern.json', function(err2,data2){
            stopping_patterns = JSON.parse(data2);

            fs.readFile('./app/data_output/stations_zillow.json', function(err3,data3){
                zillow = JSON.parse(data3);

                parseData();
            });
        });
    })
});

function parseData(){

    // generate uniqueStations, as well as duration links
    allLines.forEach(function(line){
        var terminal = (line.stations.filter(function(elem){
            return elem.terminal == true;
        }))[0];

        line.stations.forEach(function(station){

            //for each station, decide if it's already in the uniqueStations array
            var duplicateStation = uniqueStations.filter(function(elem){
                return elem.id == station.id;
            });
            if(duplicateStation.length === 0){
                var zillowData = (zillow.filter(function(elem){
                   return elem.id === station.id;
                }))[0];

                var meta = (metadata.filter(function(elem){
                   return elem.id === station.id;
                }))[0];

                station.psf = zillowData.psf;
                station.value_index = zillowData.value_index;
                station.lines = meta.lines;

                uniqueStations.push(station);
            }else{
                duplicateStation[0].freq += station.freq;
            }

            //for each station, decide if the duration link has been drawn
            var durationLink = links.filter(function(elem){
                return (elem.source === station.id && elem.target === terminal.id);
            });
            //if not present
            if(durationLink.length === 0 && station.id !== terminal.id){
                links.push({
                    source: station.id,
                    target: terminal.id,
                    duration: station.duration,
                    type: "duration"
                });
            }

        });
    });

    // generate frequency links
    stopping_patterns.forEach(function(line1){
        var line = (allLines.filter(function(elem){
            return elem.line_id === line1.line_id;
        }))[0];
        if(!line){ console.log("ERROR"); }

        var stations = line.stations, //array of station objects
            patterns = line1.patterns; //array of pattern objects

        patterns.forEach(function(pattern){
            var passing_trains = 0;
            var stops = pattern.stops; //array of stopping station indices

            for(var i=0; i<stops.length; i++){

                var index = stops[i];

                if(!stations[index].passing){
                    stations[index].passing = 0;
                }

                if(stations[index].freq > passing_trains){
                    passing_trains = stations[index].freq;
                    stations[index].passing += passing_trains;
                }else{
                    stations[index].passing += passing_trains;
                }

                if(stops[i+1]){
                    //don't duplicate frequency links
                    var uniqueLink = (links.filter(function(elem){
                        return (elem.source === stations[index].id && elem.target=== stations[ stops[i+1] ].id  && elem.type === 'frequency');
                    }))[0];
                    if(uniqueLink){
                        uniqueLink.value += passing_trains;
                    }else{
                        links.push({
                            source: stations[index].id,
                            target: stations[ stops[i+1] ].id,
                            type: 'frequency',
                            value: passing_trains
                        });
                    }
                }
            }
        });
    });


    console.log(uniqueStations.length);
    console.log(links.length);

    outputFile();
}


function outputFile(){
    var data = {
        stations: uniqueStations,
        links: links
    }

    fs.writeFile('app/data_output/stations_parsed.json', JSON.stringify(data, null, 4), function (fileErr) {
        if (fileErr) throw fileErr;
        console.log("File write completed");
    });
}