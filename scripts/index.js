// Codepens
/*
https://codepen.io/joshbuchea/pen/xVNzXE
https://codepen.io/ensustudio/pen/BWeLaN
https://codepen.io/mochaNate/pen/WrbZgJ
https://codepen.io/volv/pen/bpwRLL
*/

// $.when($.ajax(...), $.ajax(...)).then(function (resp1, resp2) {
//     //this callback will be fired once all ajax calls have finished.
// });

// local database where the info from the spreadsheets are compiled
var userDB = {},
	characterDB = {},
	housingDB = {};

$(function() {  

    //JSONP
    $.when(
		$.ajax({
			url: 'https://spreadsheets.google.com/feeds/list/12rNhHS0HsSpKjfovyb26ZQ4x4eOA_2rbLDMC7uc5R1s/od6/public/values?alt=json-in-script',
			dataType: 'jsonp'
		}),
		$.ajax({
			url: 'https://spreadsheets.google.com/feeds/list/1uLSkKY1GbBC_fcgPz1EWGE-V97C-OzpW2kdDjx3AwdA/od6/public/values?alt=json-in-script',
			dataType: 'jsonp'
	}))
	.done((main, housing) => compileData(main, housing))
	.fail(function(xhr){
		$.mobile.changePage('#error',{transition:'slide'})
	});
  });

// Process the gold calculation based on the spreadsheets.
function compileData (main, housing) {
	console.log(main);
  	console.log(housing);

	// If something messed up here, stop processing.
	if (!main[0] || !housing[0]) {
		return;
	}

	var mainFeed = main[0].feed,
		housingFeed = housing[0].feed,
		mainRows = mainFeed.entry || [],
		housingRows = housingFeed.entry || [];

	// set up housing DB
	housingRows.forEach(function(row) {
		var rowAddress = row['gsx$address'].$t,
			rowAddressArray = rowAddress.split('/'),
			rowHasPaint = row['gsx$haspaint'].$t,
			rowHasBathroom = row['gsx$hasbathroom'].$t,
			rowHasKitchen = row['gsx$haskitchen'].$t,
			rowHasRoomA = row['gsx$hasrooma'].$t;

		housingDB[rowAddress] = {
			address: rowAddressArray,
			isCommunal: (rowAddressArray[0] === "ai" || rowAddressArray[0] === "ss"),
			residents: "",
			hasPaint: rowHasPaint,
			hasBathroom: rowHasBathroom,
			hasKitchen: rowHasKitchen,
			hasRoomA: rowHasRoomA
		}
	});

	console.log(housingDB);

	mainRows.forEach(function(row) {
		var rowUsername = row['gsx$username'].$t,
			rowImg = row['gsx$img'].$t !== "" ? row['gsx$img'].$t : "https://orig09.deviantart.net/b2eb/f/2017/191/c/0/px_blank_by_toffeebot-dbfv3db.png",
			rowEnroll = getActiveSinceDate(row['gsx$enroll'].$t),
			rowGold = parseInt(row['gsx$gross'].$t),
			rowBonus = parseInt(row['gsx$bonus'].$t),
			rowSpending = parseInt(row['gsx$spending'].$t),
			rowTotal = rowGold + rowBonus - rowSpending,
			rowCharacters = getCharacterArray(row);

			div = document.createElement('div');

		userDB[rowUsername] = {
			username: rowUsername,
			img: rowImg,
			enroll: rowEnroll,
			gold: rowGold,
			bonus: rowBonus,
			spending: rowSpending,
			total: rowTotal,
			characters: rowCharacters
		}

		div.className = 'cell-outer';
		div.innerHTML = `<a href="#" id="userCell" data-id="${rowUsername}">
							<div class="username" role="userName">${rowUsername}</div>
							<div class="image" role="image"><img src="${rowImg}"></div>
						</a>`;

		$('a#userCell', div ).on( 'click', function( ev ){
			var user = ev.currentTarget.dataset['id'],
				pageContent = appendUserInfo(user);
			
			$('div#userInfo').empty().append(pageContent);
			$.mobile.changePage('#view', {transition:'slide'});
		});

		$('div#member-container').append(div);
	}, this);

	// Show page
	$("#loader").delay(1500).slideToggle("slow");
	console.log(userDB);
	console.log(characterDB);
}

function getActiveSinceDate(enrollNum) {
	var enrollDate;

	switch (enrollNum) {
		case "1":
			enrollDate = "August 1st, 2014";
			break;
		case "2":
			enrollDate = "January 21st 2015";
			break;
		default:
			enrollDate = "Forever";
	}
	
	return enrollDate;
}

function getCharacterArray(row) {
	var characters = {},
		characterNum,
		characterString,
		characterArray,
		characterName;

	for (var i = 1; i <= 9; i++) {
		characterNum = "gsx$character" + i;

		if (row[characterNum].$t !== "") {
			characterString = row[characterNum].$t;
			characterArray = characterString.split(',');
			characterName = characterArray[0].toLowerCase();

			//add to object
			characters[characterName] = {
				name: characterArray[0],
				birthday: characterArray[1].split('/'),
				app: characterArray[2],
				isHybrid: characterArray[3],
				isNPC: characterArray[4],
				housing: getHousing(characterArray[5], characterName),
				image: characterArray[6] ? characterArray[6] : "http://orig03.deviantart.net/6fdd/f/2017/193/6/2/se5_10_restoredwoolyisland_by_toffeebot-dbg4gsi.png"
			};

			characterDB[characterName] = characters[characterName];
		} else {
			break;
		}
	}

	return characters;
}

function getHousing(housingObj, characterName) {
	var needsDB = housingObj.includes("/") ? true : false,
		housing, residentsString;

	if (needsDB) {
		var residentsString = housingDB[housingObj].residents === "" ? characterName : "," + characterName;
		housingDB[housingObj].residents += residentsString;
		housing = housingDB[housingObj];
	} else {
		housing = housingObj;
	}

	return housing;
}

function appendUserInfo (user) {
  	var	userData = userDB[user],
	  	username = userData.username,
	  	userLink = `https://${username}.deviantart.com`,
	  	userGross = userData.gold,
		userBonus = userData.bonus,
		userSpent = userData.spending,
		userTotal = userData.total,
		memberSince = userData.enroll,
		userCharacterData = appendCharacterInfo(userData.characters),
	  	div = document.createElement('div');

		div.className = 'cell-outer';
		div.innerHTML = `
		<div class="userInfoItem">
			<div class="userContentHeader">
				stats
			</div>
			<div class="userContent userStats" id="userStats">
				<span class="userCells usersName">Username: <a href="${userLink}">${username}</a></span>
				<span class="userCells userEnroll">Member Since: ${memberSince}</span>
			</div>
		</div>
		<div class="userInfoItem">
			<div class="userContentHeader">
				gold
			</div>
			<div class="userContent userGold" id="userGold">
				<span class="userCells userGross">Earned: ${userGross}</span>
				<span class="userCells userBonus">Bonuses: ${userBonus}</span>
				<span class="userCells userSpendings">Spent: ${userSpent}</span>
				<hr/>
				<span class="userGoldTotal">Total: ${userTotal}</span>
				<div class="clear"></div>
			</div>
		</div>
		${userCharacterData}`;

	return div;
}

function appendCharacterInfo (characterObj) {
	var template,
		compiledTemplate = "",
		character,
		birthday,
		location,
		isHybrid,
		isNPC;

	Object.keys(characterObj).forEach(function (characterName) {
		character = characterObj[characterName];
		isHybrid = character.isHybrid === "true" ? `<img src="http://orig11.deviantart.net/5717/f/2017/192/d/b/ishybrid_icon_by_toffeebot-dbfzh9l.png">` : "";
		isNPC = character.isNPC === "true" ? `<img src="http://orig13.deviantart.net/d403/f/2017/192/6/7/isnpc_icon_by_toffeebot-dbfzcxu.png">` : "";
		birthday = parseBirthday(character.birthday);
		location = parseLocation(character.housing, characterName);

		template = `<div class="userInfoItem">
				<div class="userContentHeader">
					${character.name}
				</div>
				<div class="userContent userCharacter">
					<div class="userCharaLeft">
						<div class="userCharaPortrait" style="background-image: url('${character.image}');"></div>
						<div class="userCharaInfo">
							<a href="${character.app}"><img src="http://orig01.deviantart.net/ee76/f/2017/192/a/3/app_icon_by_toffeebot-dbfzcxy.png"></a>
							${isHybrid}
							${isNPC}
						</div>
					</div>
					<div class="userCharaRight">
						<div class="charaHousingInfo">
							birthday: ${birthday}
							${location}
						</div>
					</div>
				</div>
			</div>`;

		compiledTemplate = compiledTemplate.concat(template);
	});
	return compiledTemplate;
}

function parseBirthday(bdayArray) {
	var season,
		day = bdayArray[1];

	switch(bdayArray[0]) {
		case "1":
			season = "Spring";
			break;
		case "2":
			season = "Summer";
			break;
		case "3":
			season = "Fall";
			break;
		default:
			season="Winter";
	}

	return season + " " + day;
}

function parseLocation(location, characterName) {
	var template,
		housemates,
		address;

	if (!location.residents) {
		// not an object, would be a shop building
		template = `<br>Address: ${location}`
	} else {
		housemates = getHousemates(location.residents, characterName);
		address = getAddress(location.address);
		template = `
			<br>Address: ${address}
			${housemates}`;

		if (!location.isCommunal) {
			//standard housing has upgrades
			var upgradesTemplate = parseUpgrades(location);

			if (upgradesTemplate === "") {
				// we are done
				return template;
			}

			template = template.concat(`
				<br>Upgrades:
				<br><div class="charaHouseUpgrades">
					<ul>
						${upgradesTemplate}						
					</ul>
				</div>`);
		}
	}
	
	return template;
}

function getAddress(addressArray) {
	var location,
		number = addressArray[1] === "cc" ? "Captain's Quarters" : addressArray[1];

	switch(addressArray[0]) {
		case "tt":
			location = "Toffee Town";
			break;
		case "ll":
			location = "Lemon Lake";
			break;
		case "ff":
			location = "Flan Forest";
			break;
		case "ss":
			location = "Sherbet Seasonal House";
			break;
		default:
			location="Almond Inn";
	}

	return location + " " + number;
}

function getHousemates(housematesString, characterName) {
	var housemateArray = housematesString.split(','),
		newHousemateList = "";
	housemateArray.forEach(function(housemateName) {
		if (housemateName !== characterName) {
			newHousemateList = newHousemateList === "" ? newHousemateList.concat(housemateName) : newHousemateList.concat(", " + housemateName)
		}
	});

	return newHousemateList !== "" ? `<br>Housemate(s): ${newHousemateList}` : "";
}

function parseUpgrades (locationObj) {
	var hasPaint = locationObj.hasPaint === "0" ? "" : `<li>Paint Job</li>`,
		hasKitchen = locationObj.hasKitchen === "0" ? "" : `<li>Kitchen<ul><li>level ${locationObj.hasKitchen}</li></ul></li>`,
		hasBathroom = locationObj.hasBathroom === "0" ? "" : `<li>Bathroom<ul><li>level ${locationObj.hasBathroom}</li></ul></li>`,
		hasRoomA = locationObj.hasRoomA === "0" ? "" : `<li>Room A<ul><li>level ${locationObj.hasRoomA}</li></ul></li>`;

	return hasPaint.concat(hasKitchen, hasBathroom, hasRoomA);
}

function SendScore() {
    $.get("https://script.google.com/macros/s/AKfycbwakI6-PGan8xiH9Z7wt3LQriogpIwjr2rzk93GsScClg5_4zs/exec", {
            "name": document.getElementById("nameInput").value,
            "number": document.getElementById("phoneInput").value,
            "score": document.getElementById("textInput").value
        },
        function(data) {
            console.log(data);
        }
    );
}

function startLoading() {
	$.mobile.loading( 'show', {
		text: "please wait...",
		textVisible: true,
		theme: "b",
		textonly: false
	});	
}

function stopLoading() {
  $.mobile.loading( "hide" );
}


$.fn.delay = function(time, callback){
	jQuery.fx.step.delay = function(){};
	return this.animate({delay:1}, time, callback);
}