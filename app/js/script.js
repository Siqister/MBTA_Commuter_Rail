var  margin = {t:50, r:50, b:50, l:50},
    width = $('.canvas').width() - margin.l - margin.r,
    height = $('.canvas').height() - margin.t - margin.b;

var projection = d3.geo.projection(function(a, b){
    return [
        a,
        Math.log(Math.tan(Math.PI/4 + b/2))
    ];
})
    .center([-71.0632918, 42.3689482])
    .translate([width/2, height/2])
    .scale(27000);

var scales = {};
    scales.stationSize = d3.scale.log().domain([0.1,15]).range([0.1,4.5]);
    scales.color = d3.scale.linear().range(['#00BCC7','#F0576D']);
    scales.linkLength = d3.scale.linear().range([0,height/2]);
    scales.linkWidth = d3.scale.linear().domain([0,40]).range([0,6]);
    scales.linkColor = d3.scale.linear().domain([0,40]).range(['#00BCC7','#F0576D']);

var format = {};
    format.duration = function(sec){
      var h = Math.floor(sec/3600),
          m = Math.floor((sec%3600)/60);

      if (h===0){
          return m + " min.";
      }else{
          return h + " hour " + m + " min.";
      }
    };

var canvas = d3.select('.canvas').append('svg')
    .attr('width', width + margin.l + margin.r)
    .attr('height'. height + margin.t + margin.b)
    .append('g')
    .attr('transform', 'translate(' + margin.t + ',' + margin.l + ')');

var tooltip;

var nodeTemplate = _.template('<li><span>STATION: </span><%= id %></li>'),
    linkTemplate = _.template('<li><%= value %> trains</li>');

//Global objects for data
var uniqueStations, links, scaleTicks;
var force;

//Global variables for drawing elements
var stationNodes, stationLinks;


//Load data on DOM load
d3.json('data_output/stations_parsed.json', dataLoaded);


function dataLoaded(err, data){
    uniqueStations = data.stations;
    links = data.links;

    console.log(links.length);
    console.log(uniqueStations.length);


    //set "fixed" attribute
    //and initial "x" and "y" attributes
    uniqueStations.forEach(function(station){
       station.x = projection([station.location.lng, station.location.lat])[0];
       station.y = projection([station.location.lng, station.location.lat])[1];
        if(station.terminal === true){
            station.fixed = true;
        }
       station.duration_parsed = format.duration(station.duration);
    });


    //parse link for force layout
    links.forEach(function(link){
       var source = _.findWhere(uniqueStations, {id: link.source}),
           target = _.findWhere(uniqueStations, {id: link.target});

        link.source = source;
        link.target = target;
    });



    //set the proper scales
    var maxDuration = Math.round(d3.max(uniqueStations, function(d){return d.duration; })/900)*900;
    scales.color.domain([0,maxDuration-900]);


    //set up the force layout
    force = d3.layout.force()
        .size([width,height])
        .linkStrength(function(link){
            if(link.type==='duration'){
                return 1;
            }else if(link.type==='frequency'){
                return 0.2;
            }
        })
        .gravity(0)
        .charge(-2)
        .friction(0);

    force
        .nodes(uniqueStations)
        .links(links)
        .on('tick',onTick);


    //DOM
    $('.control a').on('click', function(e){
        e.preventDefault();
        $('.control a').removeClass('active');
        $(this).addClass('active');

        (controls[$(this).attr('id')])();
    });

    tooltip = $('.tooltip');


    //Draw station nodes and links, without invoking the force layout
    redraw();
}

var showSpace = function(){
    force.stop();

    uniqueStations.forEach(function(station){
        station.x = projection([station.location.lng, station.location.lat])[0];
        station.y = projection([station.location.lng, station.location.lat])[1];
    });

    stationNodes
        .transition()
        .attr('transform', function(d){
            return 'translate('  + d.x + ',' + d.y + ')';
        });
    stationLinks
        .transition()
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    //Draw scale
    scaleTicks = [];
    drawScale();

    nodeTemplate = _.template('<li><span>STATION: </span><%= id %></li>');

};

var showTime = function(){
    force.stop();

    //reset scales
    var max = Math.round(d3.max(uniqueStations, function(d){return d.duration; })/900)*900;
    scales.linkLength = d3.scale.linear().domain([0,max-900]).range([0,height/2]);

    //re-calculate force layout
    force
        .linkDistance(function(link){
            if(link.type==='duration'){
                return scales.linkLength(link.duration);
            }else if(link.type==='frequency'){
                return 20;
            }
        })
        .charge(-2);

    //redraw
    force.start();
    redraw();

    //Draw scale
    scaleTicks = [];
    var i = 0;
    for(var v=0; v<= max; v+=900){
        var _class = 'minor';
        if(v%1800 === 0 && v!== 0){
            _class = 'major';
        }
        scaleTicks.push({
            index: i,
            value: v,
            class: _class,
            label: format.duration(v)
        });
        i++;
    }
    drawScale();

    //Change tooltip label
    nodeTemplate = _.template('<li><span>STATION: </span><%= id %></li><li><span>TIME: </span><%= duration_parsed %></li>');
};


var showMoney = function(){
    force.stop();

    //re-calculate max and min
    var max = d3.max(uniqueStations, function(d){ return d.psf; }) - 100,
        min = d3.min(uniqueStations, function(d){ return d.psf; });

    console.log(min);
    console.log(max);

    scales.linkLength = d3.scale.log().domain([max,min]).range([0,height/2 + margin.t]);

    //re-calculate force layout
    force
        .linkDistance(function(link){
            if(link.type==='duration'){
                return scales.linkLength(link.source.psf);
            }else if(link.type==='frequency'){
                return 20;
            }
        })
        .charge(-4);

    //restart force
    force.start();
    redraw();

    //draw scale
    scaleTicks = [];
    var i = 0;
    for(var v= (Math.floor(max/100))*100; v >= min-50; v-=50){
        var _class = 'minor';
        if(v%200 === 0){
            _class = 'major';
        }
        console.log(v);
        scaleTicks.push({
            index: i,
            value: v,
            class: _class,
            label: '$'+ v + "/SF"
        });
        i++;
    }
    drawScale();

    nodeTemplate = _.template('<li><span>STATION: </span><%= id %></li><li><span>Price per SF: </span>$<%= psf %>/SF</li>');
};


var controls = {
  'showSpace': showSpace,
  'showTime': showTime,
  'showMoney': showMoney
};


function redraw(){
    //Redraw
    stationLinks = canvas.selectAll('.freqLink')
        .data(links, function(d){
            return d.source.id + "-" + d.target.id + "-" + d.type;
        });
    var stationLinksEnter = stationLinks.enter()
        .insert('line')
        .attr('class','freqLink')
        .attr("id", function(d){ return d.source.id + "-" + d.target.id;})
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    stationLinks
        .transition()
        .style('stroke', function(d){
            if(d.type==="duration"){
                return "none";
            }else{
                return scales.color(d.target.duration);
            }
        })
        .style('stroke-width', function(d){
            if(d.type==="frequency"){
                return scales.linkWidth(d.value) > 15? 15:scales.linkWidth(d.value);
            }
        });


    stationNodes = canvas.selectAll('.station').data(uniqueStations, function(d){ return d.id; });
    var stationNodesEnter = stationNodes.enter();
    stationNodesEnter
        .append('g')
        .attr('class', 'station')
        .attr('id', function(d){ return d.id; })
        .attr('transform', function(d){
            return 'translate('  + d.x + ',' + d.y + ')';
        })
        .append('circle')
        .attr('r',function(d){
            return scales.stationSize(d.freq);
        })
        .style('fill',function(d){
            return scales.color(d.duration);
        })
        .style('stroke-width', '2px')
        .on('mouseenter', function(d){
           d3.select(this).transition().duration(50).attr('r', function(d){
               return scales.stationSize(d.freq)*2;
           });

           tooltip.show();
            tooltip.css({
                'left': d3.event.x + 20 + 'px',
                'top': d3.event.y + 'px',
                'background': scales.color(d.duration)
            });
            tooltip.html(nodeTemplate(d));

        })
        .on('mouseout', function(d){
            d3.select(this).transition().attr('r', function(d){
                return scales.stationSize(d.freq);
            });

            tooltip.hide();
        })
        .on('click', function(d){
           d3.select(this).attr('class','highlighted');

        });

}



function drawScale(){
    console.log(scaleTicks);

    var ticks = canvas.selectAll('.scale').data(scaleTicks, function(d){ return d.index; });
    ticks
        .enter()
        .insert('circle', '.station')
        .attr('cx', width/2)
        .attr('cy', height/2)
        .attr('r',0)
        .style('fill','none');

    ticks
        .attr('class', function(d){
            if(d.class === 'major'){ return 'scale major'; }
            else{ return 'scale'};
        })
        .transition()
        .attr('r', function(d){ return scales.linkLength(d.value);})
        .style('stroke',function(d){
            if(d.class === 'major'){
                return d3.rgb(160,160,160);
            }else{
                return d3.rgb(240,240,240);
            }
        });


    ticks
        .exit()
        .transition()
        .style('opacity',0)
        .remove();

    canvas.selectAll('.scale-text').remove();

    var tickText = canvas.selectAll('.scale-text').data(scaleTicks);
    tickText.enter()
        .insert('text')
        .attr('class', 'scale-text')
        .attr('text-anchor', 'middle')
        .text(function(d){
            if(d.class === "major")
                return d.label;
        })
        .attr('x', function(d){
            return scales.linkLength(d.value) + width/2;
        })
        .attr('y', function(d){
           return height/2;
        });

}



function onTick(e){

    //TODO: experiment with straightening
    links.filter(function(d){
        return d.type === 'frequency';
    }).forEach(function(d){
            d.target.y += (((d.source.y - height/2)/(d.source.x - width/2) - (d.target.y - height/2)/(d.target.x - width/2))* e.alpha)*(d.target.x - width/2);
    });


    stationNodes
        .attr('transform', function(d){
            return 'translate(' + d.x + ',' + d.y + ')';
        });

    stationLinks
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
}

