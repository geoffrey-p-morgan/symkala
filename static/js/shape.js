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
	
function produceShape(data) {
	var geojson = {};
	geojson['type'] = 'FeatureCollection';
	geojson['features'] = [];
			
	var colors = {};
	
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
		var controlbounds = window.setInterval(function(){
			if (shape.getBounds().isValid() == true) {
				map.fitBounds(shape.getBounds());
				window.clearInterval(controlbounds);
			}
		},500);
	}
	console.log(shape);
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
	produceShape(results.data);
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
}


var map;
function map() {
	addSection("map");
	var m = document.getElementById('section_map');
	m.click();
			
	map = L.map('display', {
		fullscreenControl: true,
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
	Papa.parse("https://s3.amazonaws.com/symkaladev6/" + fileName,config);
}