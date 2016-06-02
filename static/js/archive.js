var dataElements = new Set(); //set of selected dataElements

var totalCount = 0; //Count of Total ammount of tags, used to scale tag size based on Number

var filterValue = "*"

var lastElClick; //Track last data element clicked for shift click

function deselect(e) {
	$('.pop').slideFadeToggle(function() {
		e.removeClass('selected');
	});
}

function upload_show() {
	document.getElementById('popupContainer').style.display = 'block';
}

function upload_hide() {
	document.getElementById('popupContainer').style.display = "none";
}

//clear all and select all
$(document).keydown(function(e) {
	//clear all
	if (e.keyCode == 81 && e.ctrlKey) {
		dataElements.clear();
		$(".data").removeClass("select");
		$("#data").val(JSON.stringify([]));
		$("#dataToDelete").val(JSON.stringify([]));	
		$("#dataToRemoveTagFrom").val(JSON.stringify([]));
		$("#cardData").val(JSON.stringify([]));
	} if (e.keyCode == 89 && e.ctrlKey) {
		var state = $("#container").mixItUp('getState');
		var data = state.$show;
		console.log(data);
		$(data).each(function(){
			id = $(this).data("id");
			dataElements.add(id);
			$(this).addClass("select");
		});
		data = [];
		for (item of dataElements) {
			data.push(item);
			console.log(data);
		}
		$("#data").val(JSON.stringify(data));
		$("#dataToDelete").val(JSON.stringify(data));	
		$("#dataToRemoveTagFrom").val(JSON.stringify(data));
		$("#cardData").val(JSON.stringify(data));
	}
});

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

$(document).ready(function() {
	$("#container").mixItUp({
		callbacks: {
			onMixEnd: function(state) {
				state.$show.each(function(index,value){
					if(index % 10 > 0) {
						$(value).find('.image--expand').css("margin-left",(-100 * (index % 10)).toString() + "%");
						$(value).css("clear","none");
					} else {
						$(value).css("clear","left");
						$(value).find('.image--expand').css("margin-left","0");
					}
				})
			}
		}
	});
	
	if(hasData) {
		var minDate = new Date(minDateYear,minDateMonth-1,minDateDay);
		var maxDate = new Date(maxDateYear,maxDateMonth-1,maxDateDay);
		
		if(minDate.getTime() == maxDate.getTime()) {
			maxDateDay = parseInt(maxDateDay) + 1;
			console.log(maxDateDay);
			console.log(maxDateMonth);
			console.log(maxDateYear);
			console.log(maxDate);
			maxDate = new Date(maxDateYear,maxDateMonth-1,maxDateDay);
			console.log(maxDate);
		}	
		
		$("#slider").dateRangeSlider({
			dateFormat: "mm-dd-yy",
			bounds: {
				min: minDate,
				max: maxDate
			},
			defaultValues: {
				min: minDate,
				max: maxDate
			}
		});
		
		$("#slider").bind("userValuesChanged",function(e,data){
			min = $.datepicker.formatDate("yy-mm-dd", data.values.min);
			max = $.datepicker.formatDate("yy-mm-dd", data.values.max)
			filterDate(min,max);
		})
	}
	
	var filterDate = function(minDate,maxDate) {
		var els = $();
		$(".mix").each(function(){
			var date = new Date($(this).data("date"));
			if(date >= new Date(minDate) && date <= new Date(maxDate)) {
				els = els.add(this);
			}
		});
		$("#container").mixItUp('filter',els);
	}
	
	var dropZone = document.querySelector("#dropContainer");
	var cardButton = document.querySelector("#cardCreate");
	
	var drag = dragula([document.querySelector("#container"),document.querySelector("#filters")],{
		accepts: function(el, target, source, sibling) {
			return $(target).attr("id") == "filters";
		}, 
		copy: function(el, source) {
			return source.id == "container";
		},
		removeOnSpill: true,
		direction: 'horizontal',
	});
	
	drag.on('drop',function(el,target,source) {
		var elDetails = el.getElementsByClassName("image--expand");
		el.removeChild(elDetails[0]);
		dropZone.style.display = "none";
		cardButton.style.display = "block";
		
		var id = $(el).data("id");
		dataElements.add(id);
		data = [];
		for (item of dataElements) {
			data.push(item);
		}
		$("#cardData").val(JSON.stringify(data));
	});
	
	drag.on('remove',function(el,container,source) {
		console.log(source.id);
		console.log(source.children.length);
		if(source.id == "filters" && source.children.length == 1) {
			dropZone.style.display = "block";
			cardButton.style.display = "none";
		}
		var id = $(el).data("id");
		if(dataElements.has(id)) {
			dataElements.delete(id);
		}
		data = [];
		for (item of dataElements) {
			data.push(item);
		}
		$("#cardData").val(JSON.stringify(data));
	});
		
	var $text = $('.textPreview');
	$text.each(function(){
		$id = $(this).data("id");
		type = $(this).data("type");
		name = $(this).data("name");
		console.log(endsWith(name,".txt"))
		if(type.indexOf("text") > -1 && endsWith(name,".txt")) {
			$.ajax({
				type: "GET",
				processData: false,
				url: "/textPreview/" + $id,
				context: this,
				contentType: "application/xml; charset=utf-8",
				success: function(data) {
					var iframe = $("<iframe>");
					$id = $(this).data("id");
					iframe.attr("src","/textPreview/" + $id);
					iframe.addClass("frame");
					$(this).append(iframe);
				}
			});
		} else if(type.indexOf("pdf") > -1) {
			$.ajax({
				type: "GET",
				processData: false,
				url: "/textPreview/" + $id,
				context: this,
				contentType: "application/xml; charset=utf-8",
				success: function(data) {
					var iframe = $("<iframe>");
					$id = $(this).data("id");
					iframe.attr("src","/textPreview/" + $id);
					iframe.addClass("frame");
					$(this).append(iframe);
				}
			})
		} else if(name.indexOf("db") > -1){
			$.ajax({
				type: "GET",
				processData: false,
				url: "/textPreview/" + $id,
				context: this,
				contentType: "application/xml; charset=utf-8",
				success: function(data) {
					metaData = data['meta']
					values = data['values']
					var table = $("<table></table>");
					$(table).attr("class","csvTable");
					var head = $("<thead></thead>");
					var row = $("<tr></tr>");
					table.append(head);
					head.append(row);
					var body = $("<tbody></tbody>");
					table.append(body);
					for(fieldname of metaData) {
						row.append("<th>" + fieldname + "</th>");
					}
					for(data of values) {
						row = $("<tr></tr>");
						for(item of data) {
							row.append("<td>" + item + "</td>");
						}
						table.append(row);
					}
					$(this).append(table);
					$(".csvTable").DataTable();
				}
			});
		}  else if(type == "twitter") {
			$.ajax({
				type: "GET",
				processData: false,
				url: "/textPreview/" + $id,
				context: this,
				contentType: "application/xml; charset=utf-8",
				success: function(data) {
					var Tweet = $("<div> Tweet : " + data.status + "</div>");
					var Author = $("<div> Author : " + data.author + "</div>");
					$(this).append(Tweet);
					$(this).append(Author);
				}
			});
		} else {
			$(this).text("data preview not supported yet");
		}
	})
	
	var $cell = $('.image_cell');
		
	$cell.find('.expand_close').click(function(){
		var $thisCell= $(this).closest('.image_cell');
		$thisCell.removeClass('is-expanded').addClass('is-collapsed');
	});
				
	$(".tagContainer").each(function(){
		var count = parseInt($(this).data("count"));
		if(count >= 0) { //Check if count is defined (would get NaN if it wasn't)
			totalCount += count;
		}
	}).promise().done(function() {
		getTagSize();
	});
		
	function doClickAction(dataEl) {
		id = $(dataEl).data("id");
		if(dataElements.has(id)) {
			dataElements.delete(id);
		} else {
			dataElements.add(id);
		}
		$(dataEl).toggleClass("select");
		data = [];
		for (item of dataElements) {
			data.push(item);
		}
		$("#data").val(JSON.stringify(data));
		$("#dataToDelete").val(JSON.stringify(data));	
		$("#dataToRemoveTagFrom").val(JSON.stringify(data));
		$("#cardData").val(JSON.stringify(data));
	}
	
	function doDoubleClickAction(dataEl) {
		console.log("dbl click");
		var $thisCell = $(dataEl).closest('.image_cell');
		if($thisCell.hasClass('is-collapsed')) {
			$cell.not($thisCell).removeClass('is-expanded').addClass('is-collapsed');
			$thisCell.removeClass('is-collapsed').addClass('is-expanded');
		} else {
			$thisCell.removeClass('is-expanded').addClass('is-collapsed');
		}
	}
	
	var timer = 0;
	var delay = 200;
	var prevent = false;
	
	$("body")
		.on("click",'.data',function(event){
			id = $(this).data("id");
			if(event.target == $(this).find("#expand-jump-" + id)[0]) {
				timer = setTimeout(function() {
					if(!prevent) {
						shift = event.shiftKey; //check if shift key is pressed
						dataEl = $(event.target).closest(".data");
						doClickAction(dataEl);
					}
					prevent = false;
				},delay);
			}
		})
		.on("dblclick",'.data',function(event){
			clearTimeout(timer);
			prevent = true;
			doDoubleClickAction(event.target);
		});
		
	/*$("#deleteData").submit(function(e) {
		$.post('/deleteBatchData/',$(this).serialize(),function(data){
			console.log(data);
			$(".data").each(function(){
				console.log($(this));
				if($.inArray($(this).data("id"),data) >= 0) {
					$(this).remove();
				} 
			});
		});
		e.preventDefault();
	});*/
	
	$("#localUpload").click(function(){
		$(".popupdiv").hide();
		$(".tab").removeClass("activeTab");
		$("#localFormDiv").show();
		$("#localUpload").addClass("activeTab");
	});
	
	$("#twitter").click(function() {
		$(".popupdiv").hide();
		$(".tab").removeClass("activeTab");
		$("#twitterFormDiv").show();
		$("#twitter").addClass("activeTab");
	});
	
	$("#shape").click(function() {
		$(".popupdiv").hide();
		$(".tab").removeClass("activeTab");
		$("#shapeFormDiv").show();
		$("#shape").addClass("activeTab");
	})
	
	$("#twitterForm").submit(function(e) {
		$.post('/twitter/',$(this).serialize(),function(data){
			console.log(data);
		});
		e.preventDefault();
	});
	
	$(".clariApi").click(function() {
		id = $(this).data("id");
		$("#keywords-" + id).html('&nbsp;').load("/clarifaiApi/" + id);
		loadKeywords();
	});
	
	$("#batchTag").click(function() {
		$(".keywords").each(function() {
			id = $(this).data("id");
			$("#keywords-" + id).html('&nbsp;').load("/clarifaiApi/" + id);
		});
		loadKeywords();
	});
	
	loadKeywords();
	getDataTagClass();
});

var loadKeywords = function() {
	$(".keywords").each(function() {
		id = $(this).data("id");
		$("#keywords-" + id).html('&nbsp;').load("/loadKeywords/" + id);
	});
}

var getTagSize = function(){
	$(window).load(function() {
		var totalWidth = $("#tagContainer").outerWidth();
		console.log($("#tagContainer").outerWidth());
		$(".tagContainer").each(function(){
			var count = parseInt($(this).data("count")) + 1;
			if(count >= 0 && totalCount != 0) { //Checkif count is defined
				var percentCount = (count / totalCount) * 100;
				var width = (percentCount /100) * totalWidth;
				$(this).css({"width":width});
			}
		});
	});
}

function getDataElTagClass() {
	$(".dataElContainer").find('img').each(function(index,item){
		id = $(this).data("id");
		$.ajax({
			type: "GET",
			url: "/getTagNames/" + id,
			context: this,
			success: function(data) {
				$(this).parent().addClass(data);
			},
		});
	})
}

function getDataTagClass() {
	$(".data").each(function(){
		id = $(this).data("id");
		$.ajax({
			type: "GET",
			url: "/getTagNames/" + id,
			context: this,
			success: function(data) {
				$(this).addClass(data);
			},
		});
	});
}

$.fn.slideFadeToggle = function(easing,callback) {
	return this.animate({opacity: 'toggle', height: 'toggle'},'fast',easing,callback);
};