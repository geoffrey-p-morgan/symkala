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
	makeWordChart(results.data);
};

function makeWordChart(data) {
	var labels = [];
	var tfidf = [];
	var cloud = [];
	
	var maxSize = 0;
	
	var i;
	for(i = 0; i < data.length;i++) {
		var term = data[i]["Term"];
		var TF = data[i]["TF"];
		if(TF > maxSize) {
			maxSize = TF;
		}
		tfidf.push(data[i]["TF_IDF"]);
		cloud.push([term,TF]);
		
		labels.push(term);
	}
	var data = {
		labels: labels,
		datasets: [
			{
				label: "TFIDF",
				data: tfidf
			}
		]
	};
	var word = new Chart(ctx).Bar(data);
	
	addWordSection("cloud");
	var c = document.getElementById("section_cloud");
	c.click();
	
	
	var oldWeight = 0;
	var colors = ["#010b18","#102036","#24143","#455162","#727A86"];
	var colorIndex = -1;
	WordCloud(document.getElementById('wordChart'),{
		list:cloud,
		gridSize: Math.round(16 * $('#wordChart').width() / 1024),
		weightFactor: function (size) {
			halfGrid = ($("#wordChart").width() / 2) / maxSize;
			console.log("size : " + size);
			var endFactor = (halfGrid * size) / 2
			console.log("end factor : " + endFactor.toString());
			return (halfGrid * size) / 2 ;
		},
		color: function(word,weight) {
			if(weight != oldWeight) {
				if(colorIndex < 4) {
					colorIndex++;
				}
				oldWeight = weight;
			}
			return colors[colorIndex];
		}
	});
}

var ctx;
function makeChartTabs() {
	addWordSection("TFIDF");
	var b = document.getElementById("section_TFIDF");
	b.click();
	ctx = document.getElementById("wordChart").getContext("2d");
}

window.onload = function () {
	makeChartTabs();
	var config = constructConfig();
	console.log("symkaladev5.s3.amazonaws.com/" + fileName);
	Papa.parse("https://s3.amazonaws.com/symkaladev6/" + fileName,config);
}

var num = 0;
var displays = [];
var filters = [];
var mods = [];
var navs = [];

var addWordSection = function(id) {
	console.log("adding section!");
	
	var sections = document.getElementById('sections');
	var section = document.createElement('li');
	if(id !== undefined) {
		section.setAttribute("id","section_" + id);
		$(section).text(id);
	} else {
		section.setAttribute("id","section_" + num);
		$(section).text("tab #" + num);
	}
	section.addEventListener('click',change);
	sections.appendChild(section);
	
	var display = document.createElement('div');
	var canvas = document.createElement('canvas');
	var filter = document.createElement('div');
	var mod = document.createElement('div');
	var nav = document.createElement('div');

	display.setAttribute("id","display");
	canvas.setAttribute("id","wordChart");
	filter.setAttribute("id","filters");
	mod.setAttribute("id","mods");
	nav.setAttribute("id","nav");
		
	display.setAttribute("class","col span_4_of_4 main_content");
	display.setAttribute("style","height:600px;");
	
	canvas.setAttribute("style","height:600px;width:800px;")
	canvas.setAttribute("width","800px");
	canvas.setAttribute("height","600px");
	
	$(display).append(canvas);
	
	filter.setAttribute("class","col span_4_of_4 filter_content");
	filter.setAttribute("style","height:190px;");
	
	mod.setAttribute("class","col span_2_of_4 mod_content");
	
	nav.setAttribute("class","col span_1_of_4 nav_content");
	
	displays.push(display);
	filters.push(filter);
	mods.push(mod);
	navs.push(nav);
	
	num++;	
}

function change() {
	console.log("changing section");

	$("#sections li").each(function(){
		$(this).removeClass("active");
	});
	$(this).addClass("active");
	
	var tabs = $("ul#sections").children();
	var index = tabs.index(this);
	var display = displays[index];
	var filter = filters[index];
	var mod = mods[index];
	var nav = navs[index];
	
	$("div#display").replaceWith($(display));
	$("div#filters").replaceWith($(filter));
	$("div#mods").replaceWith($(mod));
}