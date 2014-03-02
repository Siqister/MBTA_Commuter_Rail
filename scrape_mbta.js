var request = require('request'),
    cheerio = require('cheerio'),
    fs = require('fs'),
    geocoder = require('./geocoder.js');

//Global variables for web scraping
var url_root = "http://www.mbta.com/schedules_and_maps/rail/lines/?route=",
    lines = ['FITCHBRG', 'FAIRMNT', 'WORCSTER', 'FRANKLIN', 'GREENBSH', 'HAVRHILL', 'OLCOLONY', 'LOWELL', 'NEEDHAM', 'NBRYROCK', 'PROVSTOU'],
//lines = ['WORCSTER'],
    num_lines = lines.length,
    requests_completed = 0;

var tPattern = /[0-9][0-9]:[0-9][0-9]/,
    postalPattern = /[0-9][0-9][0-9][0-9][0-9]/;

var allLines = [];


//Start webscraping
for (l in lines) {
    var url = url_root + lines[l];

    request(url, (function (lineName) {
        return function (err, res, body) {
            console.log("Completed: " + requests_completed);
            console.log("------" + lineName + "------");

            if (err)
                throw err;

            //body contains table for the whole line
            $ = cheerio.load(body);

            var line = {};
            line.line_id = lineName;
            line.stations = [];
            line.num_stations = 0;

            //Get info for the terminal station first
            var terminal = {};
            $('.ScheduleTableContainer table tr').last().each(function (i, st) {
                //terminal station
                terminal.trains = [];
                terminal.duration = 0;
                terminal.terminal = true;
                terminal.freq = 0;

                $(this).find('td').each(function (j) {
                    //TODO: use regular expression
                    var time = tPattern.test($(this).text()) ? (tPattern.exec($(this).text()))[0] : null;

                    //parse into UTC time
                    var timeUTC = new Date("2010-03-07T" + time + ":00Z"); //in seconds
                    terminal.trains.push(timeUTC);

                    terminal.freq += 1;
                    $(this).remove();
                });

                terminal.id = $(st).text();
                terminal.link = $(st).find('a').attr('href');

                line.num_stations += 1;
                $(this).remove();
            });


            //Iterate over the remaining stations
            $('.ScheduleTableContainer table tr[class!="number"]').each(function (i, st) {
                //each station; i = station index

                var station = {};
                station.trains = [];
                station.t_times = [];
                station.index = i;

                if ($(this).find('th').hasClass('headcolsubline')) {
                    station.branch = true;
                }


                $(this).find('td').each(function (j) {
                    //each train, j = train index

                    var trainTime = tPattern.test($(this).text()) ? (tPattern.exec($(this).text()))[0] : null;

                    if (trainTime && terminal.trains[j]) {
                        var trainTimeUTC = new Date("2010-03-07T" + trainTime + ":00Z"); //in seconds

                        //TODO: temporarily here
                        //station.trains.push("::"+trainTimeUTC+"-->"+terminal.trains[j]);

                        var trainTimeSec = trainTimeUTC.getTime() / 1000,
                            terminalTimeSec = terminal.trains[j].getTime() / 1000;

                        //terminal time should be later than trainTimeUTC
                        //if not, terminal time needs to be advanced by 12 hours
                        if (trainTimeUTC > terminal.trains[j]) {
                            terminalTimeSec += 3600 * 12;
                        }

                        //In some cases the train doesn't reach the terminal
                        //should check
                        if(terminalTimeSec - trainTimeSec){
                            station.t_times.push(terminalTimeSec - trainTimeSec);
                        }
                    }

                    //station.trains.push(trainTime);
                    $(this).remove();
                });


                station.id = $(st).text();
                station.link = $(st).find('a').attr('href');

                //calculate duration from terminal station
                station.freq = station.t_times.length;

                //TODO: calculate average duration
                var _totalTime = 0;
                for (var k = 0; k < station.freq; k++) {
                    _totalTime += station.t_times[k];
                }
                station.duration = _totalTime / station.freq;


                //TODO: use shortest duration for now
                delete station.t_times;
                //console.log("Station " + i + " " + station.id + ": " + station.duration);

                line.num_stations += 1;
                line.stations.push(station);
            });

            //push in the terminal station
            //Info for all stations complete
            terminal.index = line.num_stations - 1;
            line.stations.push(terminal);

            //now geocode all stations
            geocoder.geocode(line.stations, function () {
                //call back for when geocoding is completed for this line
                requests_completed += 1;
                allLines.push(line);


                //check to see if all requests completed
                //if so, end of webscraping
                if (requests_completed == num_lines) {
                    //All requests completed, send array back as JSON
                    console.log("Webscraping completed");

                    fs.writeFile('app/data_output/stations.json', JSON.stringify(allLines, null, 4), function (fileErr) {
                        if (fileErr) throw fileErr;
                        console.log("File write completed");
                    });
                }


            });
        };

    })(lines[l]));
}

