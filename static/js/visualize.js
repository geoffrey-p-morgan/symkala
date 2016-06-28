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

var heatMapLayerGroups = [];
var poiMapLayerGroups = [];

function producePoI(results,dataLat,dataLon,dataTag,dataTitle) {
	var geojson = {};
	geojson['type'] = 'FeatureCollection';
	geojson['features'] = [];
			
	var colors = {};
	
	var i;//index into data

	for(i = 0; i < results.length; i++) {
		var lat = results[i][dataLat];
		var lon = results[i][dataLon];
		var type = results[i][dataTag];
		var title = results[i][dataTitle];
		var previewImg = results[i]["preview"];
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
				var lg = poiMapLayerGroups["none"];
				if(lg === undefined) {
					lg = new L.layerGroup();
					lg.addTo(map);
					poiMapLayerGroups["none"] = lg;
				}				
				lg.addLayer(layer);
				map.addLayer(lg);
				overlays["none"] = lg;
			} else {
				for(var i = 0; i < types.length; i++) {
					if(types[i] == "") { continue; }
					var lg = poiMapLayerGroups["layer" + types[i]];
					
					if(lg === undefined) {
						lg = new L.layerGroup();
						lg.addTo(map);
						poiMapLayerGroups["layer" + types[i]] = lg;
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
}

function produceHeatMap(results,dataLat,dataLon,dataTag,dataTitle) {
	var geojson = {};
	geojson['type'] = 'FeatureCollection';
	geojson['features'] = [];
			
	var colors = {};
	
	var i;//index into data
	
	var heatPoints = { data : [] };
	for(i = 0; i < results.length; i++) {
		var lat = results[i][dataLat];
		var lon = results[i][dataLon];
		var type = results[i][dataTag];
		var title = results[i][dataTitle];
		if(!lat || !lon) {
			//Need proper coordinates for point
			continue;
		}
		var heatPoint = {
			lat: lat,
			lng: lon,
			count: 1
		};
		heatPoints.data.push(heatPoint);
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
			}
		};
		geojson['features'].push(newPoint);
	}

	console.log(results);
	console.log(heatPoints);
	heat.setData(heatPoints);
		
	console.log("made geojson");
	geoLayer = L.geoJson(geojson,{
		/*pointToLayer: function(feature, latlng){
			return L.marker(latlng,{radius: 8, fillColor: feature.properties["marker-color"]});
		},*/
		onEachFeature: function (feature,layer){
			
			types = feature.properties.type.split(" ");
			if(feature.properties.type.length == 0) {
				var lg = heatMapLayerGroups["none"];
				
				if(lg === undefined) {
					lg = new L.layerGroup();
					//lg.addTo(map);
					heatMapLayerGroups["none"] = lg;
				}
				
				lg.addLayer(layer);
			} else {
				for(var i = 0; i < types.length; i++) {
					if(types[i] == "") { continue; }
					var lg = heatMapLayerGroups["layer" + types[i]];
					
					if(lg === undefined) {
						lg = new L.layerGroup();
						//lg.addTo(map);
						heatMapLayerGroups["layer" + types[i]] = lg;
					}
					
					lg.addLayer(layer);
				}
				//map.addLayer(lg);
			}
		}
	})//.addTo(map);*/
	map.fitBounds(geoLayer.getBounds());		
	//map.addLayer(heat);
}


var numberOfMapDataLayers = 0;
var numberOf2dDataLayers = 0;

makeSections = function(numberOfSections,dataId,parsedData) {
	var fields = parsedData.meta.fields; //holds meta data of parsed csv, contains field names
	
	$(".section").each(function(){
		$(this).click();
		if(this.id == "section_Map") {	
			var i;
			for(i = 0; i < numberOfSections; i++) {
				numberOfMapDataLayers++;
				var dataDiv = document.createElement("div");
				dataLayerName = "mapDataLayer-" + numberOfMapDataLayers;
				dataDiv.innerHTML = "Data Layer " + numberOfMapDataLayers;
				dataDiv.id = dataLayerName;
				dataDiv.className = "dataLayer"
			
				var form = document.createElement("form");
				form.className = "dataLayerOptions";
			
				var selectDiv = document.createElement("div");
				selectDiv.className = "formWrapper";
				
				var wrapperDiv = document.createElement("div");
				wrapperDiv.className = "selectWrapper";
				
				var label = document.createElement("Label");
				
				var analysisSelect = document.createElement("select");
				analysisSelect.id = "map-" + dataId;
				analysisSelect.name = "analysis";
				analysisSelect.className = "analysisSelect select";
				
				label.for = analysisSelect.name
				label.innerHTML = "Select Data Viz Type";
				
				for(analysis of mapTypes) { //create dropdown
					var option = document.createElement("option");
					option.text = analysis;
					option.value = analysis;
					analysisSelect.appendChild(option);
				}
				
				
				wrapperDiv.appendChild(label);
				wrapperDiv.appendChild(analysisSelect);
				selectDiv.appendChild(wrapperDiv);
				
				var wrapperDiv = document.createElement("div");
				wrapperDiv.className = "selectWrapper";
				
				var label = document.createElement("Label");
				
				var latSelect = document.createElement("select");
				latSelect.id = "mapLat-" + dataId;
				latSelect.name = "lat";
				latSelect.className = "latSelect select";
				
				label.for = latSelect.name;
				label.innerHTML = "Select Latitude Column";
				
				var i;
				for(i = 0; i < fields.length; i++) {
					var option = document.createElement("option");
					option.text = fields[i];
					option.value = fields[i];
					latSelect.appendChild(option);
				}
				
				wrapperDiv.appendChild(label);
				wrapperDiv.appendChild(latSelect);
				selectDiv.appendChild(wrapperDiv);
				
				var wrapperDiv = document.createElement("div");
				wrapperDiv.className = "selectWrapper";
				
				var label = document.createElement("Label");
				
				var lonSelect = document.createElement("select");
				lonSelect.id = "mapLon-" + dataId;
				lonSelect.name = "lon";
				lonSelect.className = "lonSelect select";
				
				label.for = lonSelect.name;
				label.innerHTML = "Select Longitude Column";
				
				var i;
				for(i = 0; i < fields.length; i++) {
					var option = document.createElement("option");
					option.text = fields[i];
					option.value = fields[i];
					lonSelect.appendChild(option);
				}
				
				wrapperDiv.appendChild(label);
				wrapperDiv.appendChild(lonSelect);
				selectDiv.appendChild(wrapperDiv);
				
				var wrapperDiv = document.createElement("div");
				wrapperDiv.className = "selectWrapper";
				
				var label = document.createElement("Label");
				
				var tagSelect = document.createElement("select");
				tagSelect.id = "mapTag-" + dataId;
				tagSelect.name = "tag";
				tagSelect.className = "tagSelect select";
				
				label.for = tagSelect.name;
				label.innerHTML = "Select Tag Column";
				
				var i;
				for(i = 0; i < fields.length; i++) {
					var option = document.createElement("option");
					option.text = fields[i];
					option.value = fields[i];
					tagSelect.appendChild(option);
				}
				
				wrapperDiv.appendChild(label);
				wrapperDiv.appendChild(tagSelect);
				selectDiv.appendChild(wrapperDiv);
				
				var wrapperDiv = document.createElement("div");
				wrapperDiv.className = "selectWrapper";
				
				var label = document.createElement("Label");
				
				var titleSelect = document.createElement("select");
				titleSelect.id = "mapTitle-" + dataId;
				titleSelect.name = "title";
				titleSelect.className = "titleSelect select";
				
				label.for = tagSelect.name;
				label.innerHTML = "Select Title Column";
				
				var i;
				for(i = 0; i < fields.length; i++) {
					var option = document.createElement("option");
					option.text = fields[i];
					option.value = fields[i];
					titleSelect.appendChild(option);
				}
				
				wrapperDiv.appendChild(label);
				wrapperDiv.appendChild(titleSelect);
				selectDiv.appendChild(wrapperDiv);

				form.appendChild(selectDiv);
				var dataElId = document.createElement("input"); //hidden input to hold index into object holding parsed results
				dataElId.type = "hidden";
				dataElId.value = dataId;
				dataElId.name = "dataElId"
				form.appendChild(dataElId);
				
				var submitButton = document.createElement("input");
				submitButton.type = "submit"
				submitButton.className = "mapButton";
				submitButton.value = "Add To Map";
				form.appendChild(submitButton);
				
				
				dataDiv.appendChild(form);
				$("#mods").append(dataDiv);
				
			}
		}
		if(this.id == "section_2D Chart") {
			var i;
			for(i = 0; i < numberOfSections; i++) {
				numberOf2dDataLayers++;
				var dataDiv = document.createElement("div");
				dataLayerName = "2dDataLayer-" + numberOf2dDataLayers;
				dataDiv.innerHTML = "Data Layer " + numberOf2dDataLayers;
				dataDiv.id = dataLayerName;
				dataDiv.className = "dataLayer"
			
				var selectDiv = document.createElement("div");
				selectDiv.className = "dataLayerOptions";
			
				var label = document.createElement("Label");
				
				var analysisSelect = document.createElement("select");
				analysisSelect.id = "2d-" + dataId;
				analysisSelect.name = "select-" + numberOf2dDataLayers;
				analysisSelect.className = "analysisSelect";
				
				label.for = "select-" + numberOf2dDataLayers;
				label.innerHTML = "Select Data Viz Type";
				
				for(analysis of chart2d) { //create dropdown
					var option = document.createElement("option");
					option.text = analysis;
					option.value = analysis;
					analysisSelect.appendChild(option);
				}
				
				selectDiv.appendChild(label);
				selectDiv.appendChild(analysisSelect);

				dataDiv.appendChild(selectDiv);
				$("#mods").append(dataDiv);
			}
		}
	});
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

initializeMap = function(){
	for(type of types) {
		addSection(type);
	}
	
	$(".section").each(function(){
		$(this).click();
		if(this.id == "section_Map") {
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
			
			map = L.map('display', {
				layers: [heat],
				fullscreenControl: true,
			}).setView([2,45],5);
			
			console.log("made map space");
			
			L.tileLayer('https://api.mapbox.com/v4/mapbox.dark/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibW9ybyIsImEiOiJjaWZyNDRpdHI3bzZtc3ZrcTA0c3gxNnlkIn0.P1w_RwVGSztNbPQlX_gUuw',{
				attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			}).addTo(map);
		}
	});
}

var geoParser = function(results) {
	console.log("Parsing complete:", results);
	
	makeSections(1,"geoData",results);
	
	parsedData["geoData"] = results.data;
	
	var list = document.getElementById("dataTabs");
	var dataTab = document.createElement("li");
	dataTab.id = "geoData";
	dataTab.innerHTML = "GeoTagged Data";
	dataTab.className = "tab";
	list.appendChild(dataTab)
	
	var dataTable = document.createElement("table");
	dataTable.className = "dataTable geoData";
	
	var i;
	var tableRow = document.createElement("tr");
	
	var columnNames = [];
	var tableHeader = document.createElement("thead");
	for(i = 0; i < results.meta.fields.length; i++) {
		var columnHeader = results.meta.fields[i];
		var tableColumn = document.createElement("th");
		tableColumn.innerHTML = columnHeader;
		
		tableRow.appendChild(tableColumn);
		
		columnNames.push(columnHeader);
	}
	tableHeader.appendChild(tableRow);
	dataTable.appendChild(tableHeader);
	
	var tableBody = document.createElement("tbody");
	for(i = 0; i < results.data.length; i++) {
		tableRow = document.createElement("tr");
		var data = results.data[i];
		for(var j = 0; j < columnNames.length; j++) {
			var columnData = results.data[i][columnNames[j]];
			var tableColumn = document.createElement("td");
			tableColumn.innerHTML = columnData; 
			
			tableRow.appendChild(tableColumn);
		}
		tableBody.appendChild(tableRow);
	}
	dataTable.appendChild(tableBody);
	
	var dataDisplay = document.getElementById("dataDisplay");
	dataDisplay.appendChild(dataTable);
};

var csvNumber;

var csvParser = function(results) {
	console.log("Parsing complete:", results);
	for(var i = 0; i < results.data.length; i++) {
		csvNumber = i + 1;
		
		var dataConfig = constructConfig(dataParser);
		Papa.parse("https://s3.amazonaws.com/symkaladev6/" + results.data[i]["fileName"],dataConfig);
		
		var list = document.getElementById("dataTabs");
		var dataTab = document.createElement("li");
		
		csvid = "csvData" + csvNumber;
		
		dataTab.id = csvid
		dataTab.innerHTML = "CsvData " + csvNumber;
		dataTab.className = "tab";
		list.appendChild(dataTab);
		
		var dataTable = document.createElement("table");
		dataTable.id = "dataTable-" + csvNumber;
		dataTable.className = "dataTable csvData" + csvNumber;
		
		var dataDisplay = document.getElementById("dataDisplay");
		dataDisplay.appendChild(dataTable);
	}
}

var dataParser = function(results) {
	console.log("Parsing complete:" , results);
	
	var i;
	var tableRow = document.createElement("tr");
	
	var dataTable = document.getElementById("dataTable-" + csvNumber);
	
	var columnNames = [];
	var tableHeader = document.createElement("thead");
	csvid = "csvData" + csvNumber;
	parsedData[csvid] = results.data;
	
	makeSections(1,csvid,results);
	for(i = 0; i < results.meta.fields.length; i++) {
		var columnHeader = results.meta.fields[i];
		var tableColumn = document.createElement("th");
		tableColumn.innerHTML = columnHeader;
		
		tableRow.appendChild(tableColumn);
		
		columnNames.push(columnHeader);
	}
	tableHeader.appendChild(tableRow);
	dataTable.appendChild(tableHeader);
	
	
	var tableBody = document.createElement("tbody");
	for(i = 0; i < results.data.length; i++) {
		tableRow = document.createElement("tr");
		var data = results.data[i];
		for(var j = 0; j < columnNames.length; j++) {
			var columnData = results.data[i][columnNames[j]];
			var tableColumn = document.createElement("td");
			tableColumn.innerHTML = columnData; 
			
			tableRow.appendChild(tableColumn);
		}
		
		tableBody.appendChild(tableRow);
	}
	dataTable.appendChild(tableBody);
	
	$('table.dataTable').DataTable();
}

var shapeRender = function(results) {
	console.log("shape parsing done:",results)
	produceShape(results.data);
}

function constructConfig(functionName) {
	var config = {
		header: true,
		dynamicTyping: true,
		download: true,
		complete: functionName,
		skipEmptyLines: true,
	}
	return config;
}

window.onload = function () {	
	initializeMap();

	$("body").on("click",'.dataLayer',function(event){
		$(this).find(".dataLayerOptions").toggle();
	});
	
	$("body").on("click",'.dataLayerOptions',function(event){
		event.stopPropagation();
	});
	
	$("body").on("change",'.analysisSelect',function(event){
		var analysisType = this.value;
		var dataLayer = this.id.split("-")[1];
		var data = parsedData[dataLayer];
	});
	
	$("body").on("click",'.tab',function(event){
		$(".dataTable").parent().hide();
		$(".tab").removeClass("active");
		$(this).addClass("active");
		var tableId = this.id;
		$("." + tableId).parent().show();
	});
	
	$("body").on("submit",".dataLayerOptions",function(event){
		event.preventDefault();

		dataEl = parsedData[this.dataElId.value];
		analysis = this.analysis.value;
		lat = this.lat.value;
		lon = this.lon.value;
		tag = this.tag.value;
		title = this.title.value;
		
		console.log(analysis);
		
		switch(analysis) {
			case "heat":
				produceHeatMap(dataEl,lat,lon,tag,title);
			case "Points of Interest":
				producePoI(dataEl,lat,lon,tag,title)
		}	
	});
	
	var geoConfig = constructConfig(geoParser);
	var csvConfig = constructConfig(csvParser);
	var shapeConfig = constructConfig(shapeRender);
	
	parsedData = [];
	
	Papa.parse("https://s3.amazonaws.com/symkaladev6/" + geoData,geoConfig);
	Papa.parse("https://s3.amazonaws.com/symkaladev6/" + csvData,csvConfig);
	Papa.parse("https://s3.amazonaws.com/symkaladev6/" + shapeFile,shapeConfig);
}