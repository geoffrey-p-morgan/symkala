/**
 * Returns a random number between min (inclusive) and max(exclusive)
 */
function getRandom(min,max) {
	return Math.random() * (max - min) + min;
}

function rainbow(numOfSteps, step) {
		// This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
		// Adam Cole, 2011-Sept-14
		// HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
		var r, g, b;
		var h = step / numOfSteps;
		var i = ~~(h * 6);
		var f = h * 6 - i;
		var q = 1 - f;
		switch(i % 6){
			case 0: r = 1; g = f; b = 0; break;
			case 1: r = q; g = 1; b = 0; break;
			case 2: r = 0; g = 1; b = f; break;
			case 3: r = 0; g = q; b = 1; break;
			case 4: r = f; g = 0; b = 1; break;
			case 5: r = 1; g = 0; b = q; break;
		}
		var c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
		return (c);
	}
	
var mapLayerGroups = [];
//globals for data preview table
var columns = []; 
var tableData = [];
	
function produceMap(results) {
	var data = results.data
	if(data.length <= 0) { return; }
	var meta = results.meta;
	var fields = meta.fields;
	var geojson = {};
	geojson['type'] = 'FeatureCollection';
	geojson['features'] = [];
			
	var colors = {};
	
	var markers = L.markerClusterGroup();
	
	var i;//index into data
	for(i = 0; i < fields.length; i++) {
		columns.push({"title": fields[i]});
	}
	
	for(i = 0; i < data.length; i++) {
		var array = $.map(data[i],function(el) { return el });
		tableData.push(array);
		var latA = data[i]["StartLat"];
		var lonA = data[i]["StartLon"];
		var latB = data[i]["EndLat"];
		var lonB = data[i]["EndLon"];
		var type = data[i]["Tags"];
		//var title = data[i]["fulcrum_id"];
		if(!latA || !lonA || !latB || !lonB) {
			//Need proper coordinates for point
			continue;
		}
		/*var markerColor = colors[type];
		if(markerColor === undefined) {
			markerColor = rainbow(30,getRandom(1,30));
			colors[type] = markerColor;
		}*/
		
		var newPoint = {
			"type": "Feature",
			"geometry" : {
				"type":"Point",
				"coordinates": [lonA,latA] //leaflet mixes lat-lon
			},
			"properties": {
				//"title": title,
				"type": type,
				//"marker-color": markerColor,
			},
		};
		geojson['features'].push(newPoint);
		newPoint = {
			"type": "Feature",
			"geometry" : {
				"type":"Point",
				"coordinates": [lonB,latB] //leaflet mixes lat-lon
			},
			"properties": {
				//"title": title,
				"type": type,
				//"marker-color": markerColor,
			},
		};
		geojson['features'].push(newPoint);
		
		/*var line = {
			"type" : "Feature",
			"geometry" : {
				"type" : "LineString",
				"coordinates" : [[lonA,latA],[lonB,latB]]
			},
			"properties": {
				"type" : type,
			}
		};
		geojson['features'].push(line);*/
	}
			
	var myStyle = {
		"color" : "#EC5454",
	};
	
	var icon = L.mapbox.marker.icon({"marker-symbol": "circle-stroked", "marker-color" : "#EC5454"});
	
	geoLayer = L.geoJson(geojson,{
		style : myStyle,
		onEachFeature: function (feature,layer){
			if(feature.properties) {
				layer.bindPopup(feature.properties.type);
			}
			
			/*var lg = mapLayerGroups[feature.properties.type];
			
			if(lg === undefined) {
				lg = new L.layerGroup();
				lg.addTo(map);
				mapLayerGroups[feature.properties.type] = lg;
			}
			
			lg.addLayer(layer);
			map.addLayer(lg);*/
		}
	});
	markers.addLayer(geoLayer);
	markers.addTo(map);
	map.fitBounds(markers.getBounds());	

	dataTab.click();
	
	console.log(tableData);
	console.log(columns);
	$("#dataTables").DataTable({
		data: tableData,
		columns: columns
	});
	
	filterTab.click();
	//Generate Filters
	
	//Grab filter menu
	var filters = document.getElementById('menu-ui');
	
	//Find all marker types
	var typesObj = {};
	var types = [];
	var features = geojson.features;
	for(var i = 0; i < features.length; i++) {
		typesObj[features[i].properties['type']] = true;
	}
	
	//pushes keys to typesObj to types array
	//keys are the POI types
	for(var k in typesObj) types.push(k);
	
	checkboxes = [];
	
	for(var i = 0; i < types.length; i ++) {
		//Create the list item
		var item = document.createElement('li');
		item.setAttribute('class','nav');
		filters.appendChild(item);
		
		//Create a div for background (This will be changed later)
		var container = document.createElement('div');
		item.appendChild(container);
		container.setAttribute("style","background-color: " + colors[types[i]]);
		
		//Create the checkbox element
		var checkbox = container.appendChild(document.createElement('input'));
		checkbox.type = 'checkbox';
		checkbox.id = types[i];
		checkbox.checked = true;
		checkbox.setAttribute("class","filled-in " + colors[types[i]]);
		
		//Create label
		var label = container.appendChild(document.createElement('label'));
		label.innerHTML = types[i];
		label.setAttribute('for',types[i]);
		checkbox.addEventListener('change',update);
		checkboxes.push(checkbox);
	}
}

function produceShape(data) {
	var i;//index into data
	for(i = 0; i < data.length; i++) {
		console.log(data[i]);
		var shape = new L.Shapefile(data[i]["fileName"],{
			onEachFeature: function(feature, layer) {
				if (feature.properties) {
					layer.bindPopup(Object.keys(feature.properties).map(function(k) {
						return k + ": " + feature.properties[k];
					}).join("<br />"), {
						maxHeight: 200
					});
				}
			},
			style: function(feature) {
				return {
					opacity: 1,
					fillOpacity: 0.7,
					radius: 6,
					color: colorbrewer.Spectral[11][Math.abs(JSON.stringify(feature).split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)) % 11],
				}
			}
		}).addTo(map);
	}
}
	
function updateMarkerSize() {
	$(size).val(this.value);
	heat.cfg.radius = parseInt(this.value);
	heat._draw();
}

function updateMarkerOpacity() {
	$(opacity).val(this.value);
	$(".heatmap-canvas").css("opacity",this.value/100);
}

/*
 * Function that toggles a layer on/off on the map
 *
 * @param el : the element that triggered this event
 * @param layer : the layer to toggle
 */
function toggle(el,layer) {
	var filters = document.getElementById('menu-ui');
	if(!el.checked){
		map.removeLayer(layer);
		if(el.id == "toggle-poi") {
			$(filters).children().children().children("input").attr("disabled", true);
		}
	} else {
		map.addLayer(layer);
		if(el.id == "toggle-poi") {
			$(filters).children().children().children("input").removeAttr("disabled");
		}
	}
}

/*
 * Function that filters through markers and
 * redraws the heatmap
 */
function update() {
	var enabled = {};
	var latlng = []; //Lat-lon's of all enabled markers
	for(var i = 0; i < checkboxes.length; i++) {
		lg = mapLayerGroups[checkboxes[i].id];
		if(checkboxes[i].checked) {
			enabled[checkboxes[i].id] = true;
			map.addLayer(lg);
		} else {
			map.removeLayer(lg);
		}
	}
	map.eachLayer(function(f) {
		if(f.feature) {
			var enable = f.feature.properties['type'] in enabled;
			if(enable) {			  
				latlng.push(makeLatLng(f.feature));
			} 
			return enable;
		}
	});
	heat.setData({data:latlng});
}

function makeLatLng(feature) {	
		var coords = feature.geometry['coordinates'];
		//Leaflet swaps lat and lon for some reason, 
		//this is why they are swapped
		return L.latLng(coords[1],coords[0]);
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
	
function constructForceConfig() {
	var config = {
		header: true,
		dynamicTyping: true,
		download: true,
		complete: forceParser,
		skipEmptyLines: true,
	}
	return config;
}

function constructShapeConfig() {
	var config = {
		header: true,
		dynamicTyping: true,
		download: true,
		complete: shapeRender,
		skipEmptyLines: true,
	}
	return config;
}
	
var fileParser = function(results) {
	console.log("Parsing complete:", results);
	produceMap(results);
};

var forceParser = function(results) {
	console.log("Parsing complete:", results);
	produceGraph(results.data);
};

var shapeRender = function(results) {
	produceShape(results.data);
}

var config = constructConfig();
var forceConfig = constructForceConfig();
var shapeConfig = constructShapeConfig();

function makeMapMenu() {
		//Add filters menu
		var menu = document.createElement("ul");
		menu.setAttribute("id","menu-ui");
		menu.setAttribute("class","nav");
		
		var filternav = document.createElement("div");
		filternav.setAttribute("class","navtab");
		
		var tabs = document.createElement("ul");
		tabs.setAttribute("class","tab");
		
		var filterTab = document.createElement("li");
		filterTab.setAttribute("id","filterTab");
		filterTab.innerHTML = "filters";
		filterTab.addEventListener("click",function(){switchTabs(this)})
		var dataTab = document.createElement("li");
		dataTab.setAttribute("id","dataTab");
		dataTab.innerHTML = "data";
		dataTab.addEventListener("click",function(){switchTabs(this)})
		
		tabs.appendChild(filterTab);
		tabs.appendChild(dataTab);
		
		filternav.appendChild(tabs);
				
		filters = document.getElementById("filters"); //filters block of interface
		filtersDisplay = document.createElement("div"); //actual tab to hold filter list
		filtersDisplay.setAttribute("id","filterDisplay");
		filtersDisplay.appendChild(menu);
		filters.appendChild(filternav);
		filters.appendChild(filtersDisplay);
		
		dataDisplay = document.createElement("div"); //tab to hold data preview
		dataDisplay.setAttribute("id","dataDisplay");
		
		var table = $("<table></table>");
		$(table).attr("id","dataTables");
		$(dataDisplay).append(table);
		
		var mods = document.getElementById("mods");
		
		var poiHeader = document.createElement("h5");
		$(poiHeader).text("Points of Interest");
		mods.appendChild(poiHeader);
		
		var toggleDiv = document.createElement("div");
		toggleDiv.setAttribute("class","switch");
		mods.appendChild(toggleDiv);
		
		var toggleInput = toggleDiv.appendChild(document.createElement("input"));
		toggleInput.type = 'checkbox';
		toggleInput.id = "toggle-poi";
		toggleInput.checked = true;
		toggleInput.setAttribute("class","toggle toggle-round");
		
		toggleInput.addEventListener('change',function(){toggle(this,geoLayer)},false);
		
		var toggleLabel = toggleDiv.appendChild(document.createElement("label"));
		toggleLabel.setAttribute("for","toggle-poi");
}

function switchTabs(tab) {
	if(tab.id == "filterTab") {
		filters.removeChild(dataDisplay);
		filters.appendChild(filtersDisplay);
	} else if(tab.id == "dataTab") {
		filters.removeChild(filtersDisplay);
		filters.appendChild(dataDisplay);
	}
}

var heat;
var map;
function map() {
	addSection("map");
	var m = document.getElementById('section_map');
	m.click();
	
	var cfg = {
	  // radius should be small ONLY if scaleRadius is true (or small radius is intended)
	  // if scaleRadius is false it will be the constant radius used in pixels
	  "radius": 25,
	  "maxOpacity": .8, 
	  // scales the radius based on map zoom
	  "scaleRadius": false, 
	  // if set to false the heatmap uses the global maximum for colorization
	  // if activated: uses the data maximum within the current map boundaries 
	  //   (there will always be a red spot with useLocalExtremas true)
	  "useLocalExtrema": false,
	  // which field name in your data represents the latitude - default "lat"
	  latField: 'lat',
	  // which field name in your data represents the longitude - default "lng"
	  lngField: 'lng',
	  gradient: {1: "yellow"}
	};
	
	var cfg2 = {
	  // radius should be small ONLY if scaleRadius is true (or small radius is intended)
	  // if scaleRadius is false it will be the constant radius used in pixels
	  "radius": 25,
	  "maxOpacity": .8, 
	  // scales the radius based on map zoom
	  "scaleRadius": false, 
	  // if set to false the heatmap uses the global maximum for colorization
	  // if activated: uses the data maximum within the current map boundaries 
	  //   (there will always be a red spot with useLocalExtremas true)
	  "useLocalExtrema": false,
	  // which field name in your data represents the latitude - default "lat"
	  latField: 'lat',
	  // which field name in your data represents the longitude - default "lng"
	  lngField: 'lng',
	  gradient: {1: "blue"}
	};
	
	/*heat = new HeatmapOverlay(cfg);
	heat2 = new HeatmapOverlay(cfg2);*/
	
	console.log("made heat layer");
	
	map = L.map('display', {
		fullscreenControl: true,
	}).setView([2,45],5);
		
	console.log("made map space");
	
	L.tileLayer('https://api.mapbox.com/v4/mapbox.dark/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibW9ybyIsImEiOiJjaWZyNDRpdHI3bzZtc3ZrcTA0c3gxNnlkIn0.P1w_RwVGSztNbPQlX_gUuw',{
		attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		maxZoom: 18,
	}).addTo(map);
			
	makeMapMenu();
	
	//addSection("analysis");
	//var f = document.getElementById("section_analysis");
	//f.click();
}

var width = 1470,
	height = 600;
			
/**
 * Function to return first index of an obj in list
 *
 *@param list - the list to look through
 *@param obj - the object we are interested in finding
 *@return - returns the index of the object, or -1 if obj no in list
 */
function getIndex(list,obj) {
	indexes = $.map(list,function(needle,index){
		if(needle.name == obj){
			return index;
		}
	});
	return indexes.length ? indexes[0] : -1;
}

var dataNodes,dataLinks;
var svg;
/**
 * Function that constructs a springy graph
 *
 * @param data - parsed csv file as an array
 */	
function produceGraph(data) {		
	dataNodes = [];
	dataLinks = [];
	
	var i; //index into data
	
	var sourceNodeIndex,
		targetNodeIndex; //Indexes into the nodes array
		
	colors = {}
	
	for(i = 0; i < data.length; i++) {
		var sourceNode = data[i]["LocationA"];
		var targetNode = data[i]["LocationB"];
		var length = data[i]["Distance"];
		var tags = data[i]["Tags"]; 
		
		var color = colors[tags];
		if(color === undefined) {
			color = rainbow(30,getRandom(1,30));
			colors[tags] = color;
		}
		
		sourceNodeIndex = getIndex(dataNodes,sourceNode);
		targetNodeIndex = getIndex(dataNodes,targetNode);
		
		//If source node not in nodes, add it 
		if(sourceNodeIndex == -1){
			dataNodes.push({name : sourceNode, className : tags, x: 500, y: 300});
			sourceNodeIndex = dataNodes.length-1; //Not in the array, so index will be the end
		}
		//If target node not in nodes, add it
		if(targetNodeIndex == -1){
			dataNodes.push({name : targetNode, className : tags, x: 500, y: 300});
			targetNodeIndex = dataNodes.length-1; //not in the array,index will be the end
		}
		var link = {source : sourceNodeIndex, target: targetNodeIndex, length: length};
		dataLinks.push(link);
	}
	
	var zoom = d3.behavior.zoom()
		.scaleExtent([1,10])
		.on("zoom",redraw);
		
	svg = d3.select('#display')
		.html('')
		.append('svg')
			.attr('width', "100%")
			.attr('height', "100%")
			.attr("clip-path","url(#clip)")
			.call(d3.behavior.zoom().scaleExtent([-8,8]).on("zoom",redraw));
	
	svg.append("defs").append("clipPath")
			.attr("id","clip")
		.append("rect")
			.attr("width",width)
			.attr("height",height);
		
	svg.append('svg:rect')
		.attr('width',"100%")
		.attr('height',"100%")
		.attr("class","overlay");
		
	innerSvg = svg.append("g");
			
	function redraw() {
		innerSvg.attr("transform",
			"translate(" + d3.event.translate + ")"
			+ " scale(" + d3.event.scale + ")");
	}
	
	initForce();
	
	force.start();
}

var force = null,
	node = null,
	link = null;

var color = d3.scale.category20();	
	
var initForce = function() {

	innerSvg.selectAll('*').remove();
			
	force = d3.layout.force()
		.size([width, height])
		.nodes(dataNodes)
		.links(dataLinks);
			
	//Update link distances
	//Link distance is in the length property of the link
	force.linkDistance(function(link){
		return link.length;
	});
	
	link = innerSvg.selectAll('.link')
		.data(dataLinks)
		.enter().append('line')
		.attr('class', 'link')
		.attr('x1',function(d) { return dataNodes[d.source].x; })
		.attr('y1',function(d) { return dataNodes[d.source].y; })
		.attr('x2',function(d) { return dataNodes[d.target].x; })
		.attr('y2',function(d) { return dataNodes[d.target].y; });
		
	node = innerSvg.selectAll('.node')
		.data(dataNodes)
		.enter().append('circle')
		.attr('class', 'node')
		.style("fill",function(d) { return color(d.className); })
		.attr('r',5)
		.attr('cx',function(d) { return d.x; })
		.attr('cy',function(d) { return d.y; });
		
	node.each(function(d){
		if (d.className) {
			d3.select(this).classed(d.className,true);
		}
	});
				
	var stepSize = 500;	
		
	force.on('tick', function() {

		node.transition().ease('linear').duration(stepSize)
			.attr('cx', function(d) { return d.x; })
			.attr('cy', function(d) { return d.y; });

		link.transition().ease('linear').duration(stepSize)
			.attr('x1', function(d) { return d.source.x; })
			.attr('y1', function(d) { return d.source.y; })
			.attr('x2', function(d) { return d.target.x; })
			.attr('y2', function(d) { return d.target.y; });
			
	});
	
	var legend = svg.selectAll(".legend")
		.data(color.domain())
		.enter().append("g")
		.attr("class","legend")
		.attr("transform",function(d, i) { return "translate(0," + i * 20 + ")" });
	
	legend.append("rect")
		.attr("x",width - 200)
		.attr("width",18)
		.attr("height",18)
		.style("fill",color);
		
	legend.append("text")
		.attr("x",width - 250)
		.attr("y",9)
		.attr("dy",".35em")
		.style("text-anchor","end")
		.text(function(d) { return d; });
	
};	
	
var data = [];
	
window.onload = function () {
	map();
	Papa.parse("https://s3.amazonaws.com/symkaladev6/" + forceFileName,config);
	console.log("https://s3.amazonaws.com/symkaladev6/" + forceFileName);
	Papa.parse("https://s3.amazonaws.com/symkaladev6/" + shapeFile,shapeConfig);
	//Papa.parse("https://s3.amazonaws.com/symkaladev6/" + forceFileName,forceConfig);
}