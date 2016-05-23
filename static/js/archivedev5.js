var addingTags = false;
var removingTags = false;

var lastTag; //global for tag html (for updating tag count dynamically)
var tag; //global for tag name clicked

var dataElements = new Set(); //set of selected dataElements

var totalWidth = 1000;

var totalCount = 0;

var filterValue = "*"

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

$(document).ready(function() {
	var dataIso = 0; //eventual isotope container for data set
	var $grid = $('#display').imagesLoaded(function() {
		$grid.isotope({
			layoutMode: 'fitRows',
			containerStyle: {
				position: "relative",
				overflow: "auto",
				height: "300px",
			},
		});
	});
	
	/*$("img.dataSet").each(function(){
		var img = $(this);
		setInterval(function(){
			var new_src;
			var id = img.data("id");
			$.ajax({
				type: "GET",
				url: "/dataSetapi/" + id,
				context: this,
				success: function(data) {
					$(this).attr("src",data);
				},
			});
		},2000)
	});*/
	
	$('body').on('click','.tag',function() {
		console.log($(this));
		filterValue = $(this).attr('data-filter');
		console.log(filterValue);
		$grid.isotope({filter: filterValue});
		if(dataIso != 0) {
			dataIso.isotope({filter:filterValue});
		}
		$grid.isotope('layout');
	});
	
	$("body").on('click','.tag',function(event){
		newTag = $(this).data("name");
		lastTag = this;
		if(newTag == tag) {
			console.log("done adding!");
			addingTags = false;
			$(".tag").removeClass("highlight");
			return;
		} 
		tag = newTag;
		if(removingTags) {
			console.log("removing tag " + tag);
			$(".tag").removeClass("remove");
			$(this).addClass("remove");
		} else {
			addingTags = true;
			console.log("adding tag " + tag);
			$(".tag").removeClass("highlight");
			$(this).addClass("highlight");
		}	
	});
	
	$(".tag").each(function(){
		var count = parseInt($(this).data("count")) + 1;
		console.log(count);
		if(count >= 0) { //Check if count is defined (would get NaN if it wasn't)
			console.log($(this));
			totalCount += count;
		}
	});
	
	getTagSize();
	
	$(".tagGrid").isotope({
		masonryHorizontal: {
			columnWidth: 800
		}
	});
	
	$("body").on('click','.dataSet',function(){
		id = $(this).data("id");
		$(".dataElContainer").remove();
		$.ajax({
			type: "GET",
			url: "/getData/" + id,
			context: this,
			success: function(data) {
				console.log(data)
				
				var dataContainer = document.createElement('div');
				$("#dataContainer" + id).append(dataContainer);
				dataContainer.setAttribute("class","dataElContainer");
				dataIso = $(dataContainer).isotope({
					layoutMode: 'fitRows',
					containerStyle: {
						position: "relative",
						overflow: "auto",
						width: "600px",
					},
				});
				for(item of data) {
					console.log(item);
					var imgContainer = document.createElement('div');
					imgContainer.setAttribute("style","position:relative");
					$(imgContainer).append('<img class="img data" src="/api/' + item.fileId +'" data-id="' + item.id + '">');
					console.log(item.type);
					if(item.type.substring(0,4) == "text") {
						$(imgContainer).append('<div class="dataLabel">' + item.name + '</div>');
					}
					dataIso.imagesLoaded().progress( function() {
						dataIso.isotope('layout');
					})
					dataIso.append(imgContainer).isotope('appended',imgContainer);
				}
				getDataElTagClass();
				$grid.isotope({filter: filterValue});
			}
		});
	})
	
	function doClickAction(dataEl) {
		id = $(dataEl).data("id");
		console.log(dataEl);
		if(addingTags) {
			$.ajax({
				type: "GET",
				url: "/addTag/" + id + "/" + tag + "/",
				success : function(data) {
					console.log("Added tag!" + tag);
					console.log(data);
					if(lastTag != null) {
						console.log(lastTag);
						$(lastTag).html(tag + "(" + data + ")");
					}
				},
			});
		} if(removingTags) {
			$.ajax({
				type: "GET",
				url: "/removeTag/" + id + "/" + tag + "/",
				success : function(data) {
					console.log("removed tag!" + tag);
					console.log(data);
					if(lastTag != null) {
						console.log(lastTag);
						$(lastTag).html(tag + "(" + data + ")");
					}
				},
			});
		}
		if(dataElements.has(id)) {
			dataElements.delete(id);
		} else {
			dataElements.add(id);
		}
		console.log(dataElements);
		$(dataEl).toggleClass("select");
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
	
	function doDoubleClickAction(dataEl) {
		console.log("double clicked!");
		id = $(dataEl).data("id");
		window.location.href = "/view/" + id;
	}
	
	var timer = 0;
	var delay = 200;
	var prevent = false;
	
	$("body")
		.on("click",'.data',function(event){
			timer = setTimeout(function() {
				if(!prevent) {
					doClickAction(event.target);
				}
				prevent = false;
			},delay); 
		})
		.on("dblclick",'.data',function(event){
			clearTimeout(timer);
			prevent = true;
			doDoubleClickAction(event.target);
		});
		
	$("#deleteData").submit(function(e) {
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
	});
	
	$("#addTag").submit(function(e){
		console.log($(this).serialize());
		$.post('/tag/',$(this).serialize(),function(data){
			console.log(data);
			for(tag of data) {
				var existingTag = $("#tag" + tag.name);
				console.log(existingTag);
				if(existingTag != null) {
					$(existingTag).html(tag.name + "(" + tag.count + ")");
					$(existingTag).data("count",tag.count);
				} else {
					var newTag = $('<div class="tagContainer"><button id="tag' + tag.name + '" data-filter=".' + tag.name +'" data-count="' + tag.count + '" class="tag">'+ tag.name + '(' + tag.count + ')</button></div>');
					$(".tagGrid").append(newTag).isotope('appended',newTag);
					$("[id=id_existingTags]").append('<option value="' + tag.value + '">' + tag.name + '</option');
					totalCount += parseInt(tag.count) + 1;
				}
			}
			getTagSize();
			getDataElTagClass();
			getDataSetTagClass();
		});
		e.preventDefault();
	});
	
	getDataSetTagClass()
});

var getTagSize = 	function(){
	console.log("updating tag size");
	$(".tag").each(function(){
		var count = parseInt($(this).data("count")) + 1;
		if(count >= 0) { //Checkif count is defined
			var percentCount = (count /totalCount) * 100;
			var width = (percentCount /100) * totalWidth;
			console.log(width);
			$(this).css({"width":width + 50});
		}
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
				console.log(data)
				$(this).parent().addClass(data);
			},
		});
	})
}

function getDataTagClass() {
	console.log("getting tag name for data");
	$(".data").each(function(){
		id = $(this).data("id");
		$.ajax({
			type: "GET",
			url: "/getTagNames/" + id,
			context: this,
			success: function(data) {
				console.log(data)
				$(this).addClass(data);
			},
		});
	});
}

function getDataSetTagClass() {
	console.log("getting tag names");
	$(".dataContainer").each(function(){
		id = $(this).data("id");
		$.ajax({
			type: "GET",
			url: "/getDataSetTagNames/" + id,
			context: this,
			success: function(data) {
				console.log(data)
				$(this).addClass(data);
			},
		});
	});
	getDataTagClass();
}

$.fn.slideFadeToggle = function(easing,callback) {
	return this.animate({opacity: 'toggle', height: 'toggle'},'fast',easing,callback);
};