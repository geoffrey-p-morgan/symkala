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
	var meta = results.meta;
	var fields = meta.fields;
	var geojson = {};
	geojson['type'] = 'FeatureCollection';
	geojson['features'] = [];
			
	var colors = {};
	
	var i;//index into data
	
	for(i = 0; i < fields.length; i++) {
		columns.push({"title": fields[i]});
	}

	for(i = 0; i < data.length; i++) {
		var array = $.map(data[i],function(el) { return el });
		tableData.push(array);
		var lat = data[i]["latitude"];
		var lon = data[i]["longitude"];
		var type = data[i]["FacilityType"];
		var title = data[i]["fulcrum_id"];
		var previewImg = data[i]["preview"];
		if(!lat || !lon) {
			//Need proper coordinates for point
			continue;
		}

		if(type.length == 0) {
			var markerColor = colors["none"];
			if(markerColor === undefined) {
				markerColor = rainbow(30,getRandom(1,30));
				colors["none"] = markerColor;
			}
		}
					
		if(type){
			types = type.split(" ");
		} else {
			types = ""
		}
		var j; //index into types
		for(j = 0; j < types.length;j++) {
			tag = types[j];
			if(tag == "") { continue; }
			var markerColor = colors[tag];
			if(markerColor === undefined) {
				markerColor = rainbow(30,getRandom(1,30));
				colors[tag] = markerColor;
			}
		}
		
		var newPoint = {
			"type": "Feature",
			"geometry" : {
				"type":"Point",
				"coordinates": [lon,lat] //leaflet mixes lat-lon
			},
			"properties": {
				"title": title,
				"type": type,
				"marker-color": markerColor,
				"preview": previewImg,
			}
		};
		geojson['features'].push(newPoint);
	}
	
	$("#dataTable").DataTable({
		data: tableData,
		columns: columns
	});
	
	var overlays = {};
	var markers = L.markerClusterGroup();
	geoLayer = L.geoJson(geojson,{
		pointToLayer: function(feature, latlng){
			var icon = L.MakiMarkers.icon({icon: "marker", color: feature.properties["marker-color"]})
			return L.marker(latlng,{icon:icon});
		},
		onEachFeature: function (feature,layer){
			layer.bindPopup("Name: " + feature.properties.title + "<br> Tags: " + feature.properties.type + "<br>" + feature.properties.preview);
			types = feature.properties.type.split(" ");
			if(feature.properties.type.length == 0) {
				var lg = mapLayerGroups["none"];
				if(lg === undefined) {
					lg = new L.layerGroup();
					lg.addTo(map);
					mapLayerGroups["none"] = lg;
				}				
				lg.addLayer(layer);
				map.addLayer(lg);
				overlays["none"] = lg;
			} else {
				for(var i = 0; i < types.length; i++) {
					if(types[i] == "") { continue; }
					var lg = mapLayerGroups["layer" + types[i]];
					
					if(lg === undefined) {
						lg = new L.layerGroup();
						lg.addTo(map);
						mapLayerGroups["layer" + types[i]] = lg;
					}
					lg.addLayer(layer);
					map.addLayer(lg);
					overlays[types[i]] = lg;
				}
			}
		}
	});
	
	map.fitBounds(geoLayer.getBounds());
	
	L.control.layers(null,overlays).addTo(map);
	
	/* replaced with overlay
	//Generate Filters
	console.log("making filters");
	//Grab filter menu
	var filters = document.getElementById('menu-ui');
	
	//Find all marker types
	var typesObj = {};
	var types = [];
	var features = geojson.features;
	for(var i = 0; i < features.length; i++) {
		if(features[i].properties['type'].length == 0) {
			typesObj["none"] = true;
		}
		tags = features[i].properties['type'].split(" ");
		for(var j = 0; j < tags.length; j++) {
			tag = tags[j];
			if (tag == "") { continue; }
			typesObj[tag] = true;
		}
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
	} */
	
	makeList();
}

function produceShape(data) {
	var i;//index into data
	for(i = 0; i < data.length; i++) {
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
		shape.bringToBack();
	}
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
		if(checkboxes[i].id == "none") { lg = mapLayerGroups["none"]; }
		else { lg = mapLayerGroups["layer" + checkboxes[i].id]; }
		if(checkboxes[i].checked) {
			enabled[checkboxes[i].id] = true;
		}
		lg.eachLayer(function(f){
			if(f.feature) {
				if(f.feature.properties['type'].length == 0) {
					var enable = "none" in enabled;
					if(enable) {
						latlng.push(makeLatLng(f.feature));
					}
				} else {
					tags = f.feature.properties['type'].split(" ");
					for(var j = 0; j < tags.length; j ++) {
						var enable = tags[j] in enabled;
						lg = mapLayerGroups["layer" + tags[j]];
						if(enable && !map.hasLayer(lg)) {			  
							map.addLayer(lg);
						} else {
							map.removeLayer(lg);
						}
					}
				}
				return enabled;
			}
		});
	}
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

var shapeRender = function(results) {
	console.log("shape parsing done:",results)
	produceShape(results.data);
}

var config = constructConfig();
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
		
		var dataTab = document.createElement("li");
		dataTab.setAttribute("id","dataTab");
		dataTab.innerHTML = "data";
		dataTab.addEventListener("click",function(){switchTabs(this)})
		
		tabs.appendChild(dataTab);
		
		filternav.appendChild(tabs);
				
		filters = document.getElementById("filters"); //filters block of interface	
		dataDisplay = document.createElement("div"); //tab to hold data preview
		dataDisplay.setAttribute("id","dataDisplay");
		filters.appendChild(filternav);
		filters.appendChild(dataDisplay);
		
		var table = $("<table></table>");
		$(table).attr("id","dataTable");
		$(dataDisplay).append(table);
}

var heat;
var map;
function map() {
	addSection("map");
	var m = document.getElementById('section_map');
	m.click();
		
	console.log("made heat layer");
	
	map = L.map('display', {
		fullscreenControl: true,
	}).setView([2,45],5);
	
	console.log("made map space");
	
	L.tileLayer('https://api.mapbox.com/v4/mapbox.dark/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibW9ybyIsImEiOiJjaWZyNDRpdHI3bzZtc3ZrcTA0c3gxNnlkIn0.P1w_RwVGSztNbPQlX_gUuw',{
		attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	}).addTo(map);
	
		
	makeMapMenu();
}

function makeList() {
    var num_cols = 4,
    container = $('#menu-ui');
    listItem = 'li',
    listClass = 'sub-list';
    container.each(function() {
        var items_per_col = new Array(),
        items = $(this).find(listItem),
        min_items_per_col = Math.floor(items.length / num_cols),
        difference = items.length - (min_items_per_col * num_cols);
        for (var i = 0; i < num_cols; i++) {
            if (i < difference) {
                items_per_col[i] = min_items_per_col + 1;
            } else {
                items_per_col[i] = min_items_per_col;
            }
        }
        for (var i = 0; i < num_cols; i++) {
            $(this).append($('<ul ></ul>').addClass(listClass));
            for (var j = 0; j < items_per_col[i]; j++) {
                var pointer = 0;
                for (var k = 0; k < i; k++) {
                    pointer += items_per_col[k];
                }
                $(this).find('.' + listClass).last().append(items[j + pointer]);
            }
        }
    });
};

window.onload = function () {
	map();
	Papa.parse("https://s3.amazonaws.com/symkaladev6/" + fileName,config);
	Papa.parse("https://s3.amazonaws.com/symkaladev6/" + shapeFile,shapeConfig);
}