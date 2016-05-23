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
	
function produceMap(data) {
		var geojson = {};
		geojson['type'] = 'FeatureCollection';
		geojson['features'] = [];
				
		var colors = {};
		
		var i;//index into data
		for(i = 0; i < data.length; i++) {
			var lat = data[i]["Latitude"];
			var lon = data[i]["Longitude"];
			var type = data[i]["FacilityType"];
			var title = data[i]["Node Name"];
			if(!lat || !lon) {
				//Need proper coordinates for point
				continue;
			}
			var markerColor = colors[type];
			if(markerColor === undefined) {
				markerColor = rainbow(30,getRandom(1,30));
				colors[type] = markerColor;
			}
			
			var newPoint = {
				"type": "Feature",
				"geometry" : {
					"type":"Point",
					"coordinates": [lon,lat] //leaflet mixes lat-lon
				},
				"properties": {
					"title": type,
					"type": type,
					"marker-color": markerColor,
				}
			};
			geojson['features'].push(newPoint);
		}
		geoLayer = L.geoJson(geojson,{
			pointToLayer: function(feature, latlng){
				return L.marker(latlng,{radius: 8, fillColor: feature.properties["marker-color"]});
			},
			onEachFeature: function (feature,layer){
				layer.bindPopup(feature.properties.type);
				heat.addData(makeLatLng(feature));
				
				var lg = mapLayerGroups[feature.properties.type];
				
				if(lg === undefined) {
					lg = new L.layerGroup();
					lg.addTo(map);
					mapLayerGroups[feature.properties.type] = lg;
				}
				
				lg.addLayer(layer);
				map.addLayer(lg);
			}
		}).addTo(map);
		map.fitBounds(geoLayer.getBounds());		
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
	
var fileParser = function(results) {
	console.log("Parsing complete:", results);
	produceMap(results.data);
};

var config = constructConfig();

function makeMapMenu() {
		//Add filters menu
		var menu = document.createElement("ul");
		menu.setAttribute("id","menu-ui");
		menu.setAttribute("class","nav");
		
		var filters = document.getElementById("filters");
		filters.appendChild(menu);
		
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
		
		var heatHeader = document.createElement("h5");
		$(heatHeader).text("Heatmap Control");
		mods.appendChild(heatHeader);
		
		var toggleDiv = mods.appendChild(document.createElement("div"));
		toggleDiv.setAttribute("class","switch");
		
		var toggleInput = toggleDiv.appendChild(document.createElement("input"));
		toggleInput.type = 'checkbox';
		toggleInput.id = "toggle-heat";
		toggleInput.checked = true;
		toggleInput.setAttribute("class","toggle toggle-round");
		
		toggleInput.addEventListener('change',function(){toggle(this,heat)},false);
		
		var toggleLabel = toggleDiv.appendChild(document.createElement("label"));
		toggleLabel.setAttribute("for","toggle-heat");
		
		var sizeDiv = mods.appendChild(document.createElement("div"));
		sizeDiv.id = "markerSizeControl";
		
		var sizeLabel = sizeDiv.appendChild(document.createElement("label"));
		$(sizeLabel).text("marker size : ");
		sizeLabel.setAttribute("for","marker-size");
		
		var markerSize = sizeDiv.appendChild(document.createElement("input"));
		markerSize.type = "range";
		markerSize.id = "marker-size";
		markerSize.value = 25;
		markerSize.setAttribute("min",0);
		markerSize.setAttribute("max",40);
		
		markerSize.addEventListener('change',updateMarkerSize);
		
		var markerSizeValue = sizeDiv.appendChild(document.createElement("input"));
		markerSizeValue.type = "text";
		markerSizeValue.id = "size";
		markerSizeValue.value = markerSize.value;
		markerSizeValue.setAttribute("readonly",true);
		markerSizeValue.setAttribute("style","width:5%;");
			
		var opacityDiv = mods.appendChild(document.createElement("div"));
		opacityDiv.id = "markerOpacityControl";
		
		var opacityLabel = opacityDiv.appendChild(document.createElement("label"));
		$(opacityLabel).text("marker opacity : ");
		opacityLabel.setAttribute("for","marker-opacity");
		
		var markerOpacity = opacityDiv.appendChild(document.createElement("input"));
		markerOpacity.type = "range";
		markerOpacity.id = "marker-opacity";
		markerOpacity.value = 100;
		markerOpacity.setAttribute("min",0);
		markerOpacity.setAttribute("max",100);
		
		markerOpacity.addEventListener('change',updateMarkerOpacity);
		
		var markerOpacityValue = opacityDiv.appendChild(document.createElement("input"));
		markerOpacityValue.type = "text";
		markerOpacityValue.id = "opacity";
		markerOpacityValue.value = markerOpacity.value;
		markerOpacityValue.setAttribute("readyonly",true);
		markerOpacityValue.setAttribute("style","width:8%;");
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
	};
	
	heat = new HeatmapOverlay(cfg);
	
	console.log("made heat layer");
	
	map = L.map('display', {
		layers: [heat]
	}).setView([2,45],5);
	
	console.log("made map space");
	
	L.tileLayer('https://api.mapbox.com/v4/mapbox.dark/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibW9ybyIsImEiOiJjaWZyNDRpdHI3bzZtc3ZrcTA0c3gxNnlkIn0.P1w_RwVGSztNbPQlX_gUuw',{
		attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		maxZoom: 18,
	}).addTo(map);
		
	makeMapMenu();
}

window.onload = function () {
	map();
	Papa.parse("/static/data/Mogadishu_Locations.csv",config);
}