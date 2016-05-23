//Allows only Numbers in a form input 
function isNumber(evt) {
    evt = (evt) ? evt : window.event;
    var charCode = (evt.which) ? evt.which : evt.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        return false;
    }
    return true;
}

function popup_show() {
	document.getElementById('popupContainer').style.display = 'block';
}

function popup_hide() {
	document.getElementById('popupContainer').style.display = "none";
}

function constructConfig() {
	var config = {
		header: true,
		dynamicTyping: true,
		download: true,
		complete: fileParser,
		skipEmptyLines: true,
	}
	return config;
}

var globalData;

var fileParser = function(results) {
	console.log("Parsing complete:", results);
	globalData = results.data.sort(function(a,b){
		return a.x - b.x;
	});
	console.log(globalData);
	generateScatter(globalData);
};

var config = constructConfig();

function generateScatter(data) {
	var input = new Array();
	input['x'] = new Array();
	input['y'] = new Array();
	
	var domain = new Array();
	domain['x'] = new Array();
	
	var j = 0; //counter into input in case problem with parsed data
	for(var i = 0; i < data.length; i++) {
		var x = parseFloat(data[i]['x']);
		var y = parseFloat(data[i]['y']);
		if(!isNaN(x) && !isNaN(y)) {
			input['x'][j] = x;
			input['y'][j] = y;
			
			domain['x'][j] = x;
			j++;
		}
	}
	
	var model = buildModel(input);
	var trendLine = applyModel(domain,model);
	
	var margin = {top:30, right: 20, bottom: 30, left: 50},
		width = 1200 - margin.left - margin.right,
		height = 400 - margin.top - margin.bottom;
		
	var xValue = function(d) { return +d.x;},
		xScale = d3.scale.linear().range([0,width]),
		xAxis = d3.svg.axis().scale(xScale).orient("bottom");
		
		xMap = function(d) { return xScale(xValue(d)); };
		
	var yValue = function(d) { return +d.y; },
		yScale = d3.scale.linear().range([height, 0]),
		yAxis = d3.svg.axis().scale(yScale).orient("left");
		
		yMap = function(d) { return yScale(yValue(d)); };
		
	svg = d3.select("#display")
		.append("svg")
			.attr("width",width + margin.left + margin.right)
			.attr("height",height + margin.top + margin.bottom)
		.append("g")
			.attr("transform",
					"translate(" + margin.left + "," + margin.top + ")");
					
	d3.csv("https://s3.amazonaws.com/symkaladev6/" + fileName,function(error,data){
		data.forEach(function(d){
			d.x = d.x;
			d.y = +d.y;
		});
		
		xScale.domain([d3.min(data,xValue) - 1,d3.max(data,xValue) + 1]);
		yScale.domain([d3.min(data,yValue) - 1,d3.max(data,yValue) + 1]);
		
		svg.selectAll("dot")
			.data(data)
		.enter().append("circle")
			.attr("r",3.5)
			.attr("cx",xMap)
			.attr("cy", yMap);
			
				
		//bestFitLine
		var g = svg.append("g")
			.attr("class","bestFitLine");
		
		g.selectAll("best-fit")
			.data(trendLine)
			.enter().append("circle")
			.attr("class","bestFit")
			.attr("cx",xMap)
			.attr("cy",yMap)
			.attr("r",2);
			
		var fitline = d3.svg.line()
			.x(xMap)
			.y(yMap);
			
		g.append("path")
			.attr("class","line")
			.attr("d",fitline(trendLine));
					
		svg.append("g")
			.attr("class","x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis);
			
		svg.append("g")
			.attr("class", "y axis")
			.call(yAxis);
			
		var bestFitLine = d3.svg.line().x(function (d) { return d.x; })
									   .y(function (d) { return d.y; });
									   
	});
}

function graphMovingAverage() {
	var bucketsize = $("#size").val();
	var movingAverageLine = calculateMovingAverage(globalData,bucketsize);
	console.log(movingAverageLine);
		
	var g = svg.append("g")
		.attr("class","averageLine");
	
	g.selectAll("averageLine")
		.data(movingAverageLine)
		.enter().append("circle")
		.attr("class","averageLine")
		.attr("cx",xMap)
		.attr("cy",yMap)
		.attr("r",2);
		
	var fitline = d3.svg.line()
		.x(xMap)
		.y(yMap);
		
	g.append("path")
		.attr("class","line")
		.attr("d",fitline(movingAverageLine));
		
	$("g.averageLine").css("display","block");
	popup_hide();
	return false;
}

function calculateMovingAverage(data,bucketSize) {
	result = new Array();
	for(var i = 0; i < data.length; i++) {
		var x = parseFloat(data[i]['x']);
		average = 0
		var buckets = 0; //counter for number of actual elements we've looped over
		for(var j = 0; j < bucketSize && i + j < data.length; j++) {
			buckets++;
			var y = parseFloat(data[i + j]['y']);
			if(!isNaN(x) && !isNaN(y)) {
				average += y;
			}
		}
		average = average / buckets;
		if(!isNaN(x) && !isNaN(average)) {
			var point = {"x" : x, "y": average};
			result.push(point);
		}
	}
	return result;
}

function removeAnalysis() {
	$("g.bestFitLine").css("display","none");
	$("g.averageLine").css("display","none");
}

window.onload = function () {
	var drake = dragula([document.getElementById("mods"),document.getElementById("display")],{
		moves: function(el, source, handle, sibling) {
			return $(el).is("img");
		},
		accepts: function(el, target, source, sibling) {
			return $(target).attr("id") == "display";
		},
		copy: true
	});
		
	drake.on('drop',function(el,target) {
		if($(el).attr("id") == "bestfit" && $(target).attr("id") == "display") {
			$("g.bestFitLine").css("display","block");
		} if($(el).attr("id") == "movingaverage" && $(target).attr("id") == "display") {
			popup_show();
		}
		drake.remove();
	});
	
	console.log("https://s3.amazonaws.com/symkaladev6/" + fileName);
	Papa.parse("https://s3.amazonaws.com/symkaladev6/" + fileName,config);
}