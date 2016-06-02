var cards = new Set(); //set of selected cards

$(document).ready(function() {
	$(".card").click(function(event){
		id = $(this).data("id");
		if(cards.has(id)) {
			cards.delete(id);
		} else {
			cards.add(id);
		}
		cardData = []; //array of ids of selected cards
		for(var card of cards) {
			cardData.push(card);
		}
		$("#cards").val(JSON.stringify(cardData));
		var cardList = document.querySelectorAll("[data-id='" + id + "']");
		for(var i = 0; i < cardList.length; i++) {
			$(cardList[i]).toggleClass("cardSelected");
		}
	})
})