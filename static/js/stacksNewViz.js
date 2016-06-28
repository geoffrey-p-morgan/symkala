interact('.card').draggable({
	intertia: true,
	restrict: {
		restriction : "#display",
		elementRect: { top: 0, left: 0, bottom: 1, right: 1}
	},
	autoScroll: true,
	onmove: dragMoveListener,
	onstart: dragStartListener,
	onend: dragEndListener,
});

function upload_show() {
	$.ajax({
		headers: {"X-CSRFToken": csrftoken},
		method: "POST",
		url: "/getColumnOptions/",
		data : {cards: JSON.stringify(cards)},
		success: function(data) {
			console.log(data);
			var selectX = document.getElementById("x");
			var selectY = document.getElementById("y");
			for(field of data) {
				var option = document.createElement("option");
				option.text = field;
				selectX.appendChild(option);
			}
			for(field of data) {
				var option = document.createElement("option");
				option.text = field;
				selectY.appendChild(option);
			}
			console.log(selectX);
			console.log(selectY);
		}
	});
	document.getElementById('popupContainer').style.display = 'block';
}

function upload_hide() {
	document.getElementById('popupContainer').style.display = "none";
}

function csv_show() {
	var analysisValue = $(this).val();
	$("#analysis").val(analysisValue);
	console.log($(this).val());
	$.ajax({
		headers: {"X-CSRFToken": csrftoken},
		method: "POST",
		url: "/getColumnOptions/",
		data : {cards: JSON.stringify(cards)},
		success: function(data) {
			var selectX = document.getElementById("lat");
			var selectY = document.getElementById("lon");
			var selectTag = document.getElementById("tag");
			$(selectX).empty();
			$(selectY).empty();
			$(selectTag).empty();
			$(selectTag).append("<option value='' selected='selected'></option>");
			/* These next 3 loops may seem unnecesary bu for some reason putting all appends
			 * in one loop only appends to the element the method is called on last.  Seperating
			 * the loops works however */
			for(field of data) {
				var option = document.createElement("option");
				option.text = field;
				selectX.appendChild(option);	
			}
			for(field of data) {
				var option = document.createElement("option");
				option.text = field;
				selectY.appendChild(option)
			}
			for(field of data) {
				var option = document.createElement("option");
				option.text = field;
				selectTag.appendChild(option);
			}
		}
	});
	document.getElementById('csvContainer').style.display = 'block';
}

function csv_hide() {
	document.getElementById('csvContainer').style.display = "none";
}

var startX, startY;

function dragStartListener(event) {
	startX = event.pageX,
	startY = event.pageY;
}


var cards = []
function dragEndListener(event) {
	if(event.dropzone == undefined) {
		var target = event.target;
		
		target.style.webkitTransform = target.style.transform = 'translate(' + startX + 'px, ' + startY + 'px)';
	
		target.setAttribute('data-x',startX);
		target.setAttribute('data-y',startY);
	} else {
		cards = []
		for (card of activeCards) {
			cards.push(card);
		}
		$(".data").val(JSON.stringify(cards));
		$("#submit").html("");
		$("#submit").append("<div class='formSubmit'><input type='submit' name='analysis' value='Send Data to Visualize'/></div>");
		$.ajax({
			headers: {"X-CSRFToken" : csrftoken},
			method: "GET",
			url: "/cardData/",
			data: {cards: JSON.stringify(cards)},
			success: function(data) {
				console.log("got card data");
				$("#cardData tr").remove();
				$("#cardData").append("<tr><td>Name</td><td>Latitude</td><td>Longitude</td><td>Tags</td></tr>");
				for(dataInfo of data) {
					console.log(dataInfo);
					$("#cardData").append("<tr><td>" + dataInfo.name + "</td><td>" + dataInfo.lat + "</td><td>" + dataInfo.lon + "</td><td>" + dataInfo.tags + "</td></tr>");
				}
			}
		});
	}
}

function dragMoveListener(event) {
	var target = event.target,
	x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
	y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
	
	target.style.webkitTransform = target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
	
	target.setAttribute('data-x',x);
	target.setAttribute('data-y',y);
}

interact("#tools").dropzone({
	accept: '.card',
	overlap: 0.75,
	
	ondropactivate: function(event) {
		event.target.classList.add('drop-active');
	},
	
	ondragenter: function(event) {
		var draggableElement = event.relatedTarget,
			dropzoneElement = event.target;
			
		dropzoneElement.classList.add('drop-target');
		draggableElement.classList.add('can-drop');
	},
	
	ondragleave: function(event) {
		event.target.classList.remove('drop-target');
		event.relatedTarget.classList.remove('can-drop');
	},
	
	ondropdeactivate: function(event) {
		event.target.classList.remove('drop-active');
		event.target.classList.remove('drop-target');
	}
});

var activeCards = new Set(); //array of cards in drop zone

interact("#display").dropzone({
	accept: '.card',
	overlap: 0.75,
	
	ondropactivate: function(event) {
		event.target.classList.add('drop-active');
	},
	
	ondragenter: function(event) {
		var draggableElement = event.relatedTarget,
			dropzoneElement = event.target;
			
		dropzoneElement.classList.add('drop-target');
		draggableElement.classList.add('can-drop');
		
		activeCards.add($(draggableElement).data("id"));
		console.log(activeCards);
	},
	
	ondragleave: function(event) {
		var draggableElement = event.relatedTarget,
			dropzoneElement = event.target;
			
		dropzoneElement.classList.remove('drop-target');
		draggableElement.classList.remove('can-drop');
		
		activeCards.delete($(draggableElement).data("id"));
		console.log(activeCards);
		
	},
	
	ondropdeactivate: function(event) {
		event.target.classList.remove('drop-active');
		event.target.classList.remove('drop-target');
		event.relatedTarget.classList.remove('can-drop');
	}
});

