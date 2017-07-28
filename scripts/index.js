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
	housingDB = {},
	jobDB = {},
	bdayDB = [],

	// for stats
	characterCount = 0,
	hybridCount = 0,
	npcCount = 0,
	bdayCount = {
		0: 0,
		1: 0,
		2: 0,
		3: 0
	},
	housingCount = {
		tt: 0,
		ll: 0,
		ff: 0,
		cm: 0
	};

$.fn.delay = function(time, callback){
	jQuery.fx.step.delay = function(){};
	return this.animate({delay:1}, time, callback);
}

$(function() {  
	// Load events
	$(window).resize(resizeBackground);
	resizeBackground();

	//JSONP
    $.when(
		$.ajax({
			url: 'https://spreadsheets.google.com/feeds/list/12rNhHS0HsSpKjfovyb26ZQ4x4eOA_2rbLDMC7uc5R1s/od6/public/values?alt=json-in-script',
			dataType: 'jsonp'
		}),
		$.ajax({
			url: 'https://spreadsheets.google.com/feeds/list/1uLSkKY1GbBC_fcgPz1EWGE-V97C-OzpW2kdDjx3AwdA/od6/public/values?alt=json-in-script',
			dataType: 'jsonp'
		}),
		$.ajax({
			url: 'https://spreadsheets.google.com/feeds/list/1akcljZBuQ8vzDrz3cFvEAGyma_GSBMo6YynH56uT2p4/od6/public/values?alt=json-in-script',
			dataType: 'jsonp'
		})
	)
	.done((main, housing, jobList) => compileData(main, housing, jobList));
  });

// Resize the background
function resizeBackground() {
    $("#bg").height($(window).height());
}

function createBdayDB() {
	for (var i=0; i<4; i++) {
		bdayDB.push([]);
		for (var j=0; j<28; j++) {
			bdayDB[i].push([]);
		}
	}
}

// Process the gold calculation based on the spreadsheets.
function compileData (main, housing, jobList) {
	console.log(main);
  	console.log(housing);
	console.log(jobList);

	// If something messed up here, stop processing.
	if (!main[0] || !housing[0] || !jobList[0]) {
		return;
	}

	createBdayDB();
	console.log(bdayDB);

	var mainFeed = main[0].feed,
		housingFeed = housing[0].feed,
		jobFeed = jobList[0].feed,
		mainRows = mainFeed.entry || [],
		housingRows = housingFeed.entry || [],
		jobRows = jobFeed.entry || [];

	createJobDB(jobRows);
	console.log(jobDB);

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
			$.mobile.changePage('#view', {transition:'none'});
		});

		$('div#member-container').append(div);
	}, this);

	// Construct the calendar
	createInitialCalendar();

	// Populate housing
	populateHousing();

	$("span#charaCount").text(characterCount);

	$("span#hybridRatio").text("are hybrid: " + getPercentage(hybridCount) + "%");
	$("span#npcRatio").text("are npcs: " + getPercentage(npcCount) + "%");

	$("span#bday-spring").text("were born in spring: " + getPercentage(bdayCount[0]) + "%");
	$("span#bday-summer").text("were born in summer: " + getPercentage(bdayCount[1]) + "%");
	$("span#bday-fall").text("were born in fall: " + getPercentage(bdayCount[2]) + "%");
	$("span#bday-winter").text("were born in winter: " + getPercentage(bdayCount[3]) + "%");

	$("span#home-tt").text("moved to toffee town's residential area: " + getPercentage(housingCount["tt"]) + "%");
	$("span#home-ll").text("moved to lemon lake's residential area: " + getPercentage(housingCount["ll"]) + "%");
	$("span#home-ff").text("moved to flan forest's residential area: " + getPercentage(housingCount["ff"]) + "%");
	$("span#home-res").text("stayed in shop residence or provided lodging: " + getPercentage(housingCount["cm"]) + "%");

	// REMOVE LATER
	console.log(userDB);
	console.log(characterDB);
	console.log(housingDB);

	console.log(characterCount);
	console.log(hybridCount);
	console.log(bdayCount);
	console.log(housingCount);

	$('form#fpcalc').on('submit', function(e){
		e.preventDefault();
		calculateFP();
	});

	$('form#rpcalc').on('submit', function(e){
		e.preventDefault();
		calculateRP();
	});

  // Show page
	$("#loader").delay(1500).slideToggle("slow");
}

function getPercentage(number) {
	return (number / characterCount * 100).toFixed(1);
}

function createJobDB(jobRows) {
	jobRows.forEach(function(row) {
		jobDB[row['gsx$key'].$t] = {
			building: row['gsx$building'].$t,
			job1: row['gsx$job1'].$t,
			job2: row['gsx$job2'].$t,
			job3: row['gsx$job3'].$t
		}
	});
}

function createInitialCalendar() {
	var table = $('<table></table>'),
		tbody = $('<tbody></tbody>'),
		date = 1;

	table.attr('class', "calendar");
	table.attr('id', "calendar-numbers");
	table.html(`
						<thead class="spring-color">
							<tr>
								<td>Sun</td>
								<td>Mon</td>
								<td>Tue</td>
								<td>Wed</td>
								<td>Thu</td>
								<td>Fri</td>
								<td>Sat</td>
							</tr>
						</thead>`);
	
	for (var i = 0; i < 4; i++) {
		var tr = $('<tr></tr>');

		for (var j = 0; j < 7; j++) {
			var td = $('<td></td>'),
				tdId = 'day' + date;

			td.attr('id', tdId);
			td.attr('data-season', 0);
			td.attr('data-day', date-1);
			td.text(date);

			if (bdayDB[0][date-1].length > 0) {
				td.attr('class', 'has-bday spring-color');
			}

			td.on( 'click', function( ev ){
				var season = $(this).attr('data-season'),
					day = $(this).attr('data-day'),
					pageContent = getBdayDiv(season, day);
				
				$('div#bdayList').empty().append(pageContent);
			});

			tr.append(td);
			date++;
		}

		tbody.append(tr);
	}

	table.append(tbody);
	$('div#calendar').append(table);
}

function getBdayDiv(season, day) {
	var bdayArray = bdayDB[season][day];
	if (bdayArray.length === 0) {
		return "";
	} else {
		var appLink = characterDB[bdayArray[0]].app;
			bdayString = `<a href="${appLink}" target="_blank">${bdayArray[0]}</a>`;
		for (var i=1; i<bdayArray.length; i++) {
			appLink = characterDB[bdayArray[i]].app;
			bdayString += `<br><a href="${appLink}" target="_blank">${bdayArray[i]}</a>`;
		}

		var template = `
			<div class="userInfoItem">
				<div class="userContentHeader">
					birthdays
				</div>
				<div class="userContent userStats" id="userStats">
					${bdayString}
				</div>
			</div>`;

		return template;
	}
}

function getActiveSinceDate(enrollNum) {
	var enrollDate;

	switch (enrollNum) {
		case "0": 
			enrollDate = "the beginning (june 3rd, 2014)";
			break;
		case "1":
			enrollDate = "enrollment 1 (August 3rd, 2014)";
			break;
		case "2":
			enrollDate = "enrollment 2 (January 13th 2015)";
			break;
		case "3":
			enrollDate = "enrollment 3 (July 14th 2015)";
			break;
		case "4":
			enrollDate = "enrollment 4 (January 24th 2016)";
			break;
		case "5":
			enrollDate = "enrollment 5 (September 3rd 2016)";
			break;
		default:
			enrollDate = "via invite";
	}
	
	return enrollDate;
}

function addToBdayDB(bdayArray, characterName) {
	bdayDB[bdayArray[0]-1][bdayArray[1]-1].push(characterName);

	bdayCount[bdayArray[0]-1]++;
}

function getCharacterArray(row) {
	var characters = {},
		characterNum,
		characterString,
		characterArray,
		characterName,
		characterBirthday;

	for (var i = 1; i <= 9; i++) {
		characterNum = "gsx$character" + i;

		if (row[characterNum].$t !== "") {
			characterString = row[characterNum].$t;
			characterArray = characterString.split(',');
			characterName = characterArray[0].toLowerCase(),
			characterBirthday = characterArray[1].split('/');

			addToBdayDB(characterBirthday, characterName);

			//add to object
			characters[characterName] = {
				name: characterArray[0],
				birthday: characterBirthday,
				app: characterArray[2],
				isHybrid: characterArray[3],
				isNPC: characterArray[4],
				housing: getHousing(characterArray[5], characterName),
				job: getJob(characterArray[6].split('/')),
				image: characterArray[7] ? characterArray[7] : ""
			};

			if (characterArray[3] === "true") {
				hybridCount++;
			}

			if (characterArray[4] === "true") {
				npcCount++;
			}

			characterCount ++;

			characterDB[characterName] = characters[characterName];
		} else {
			break;
		}
	}

	return characters;
}

function getJob(jobArray) {
	return jobDB[jobArray[0]]["job" + jobArray[1]];
}

function getHousing(housingObj, characterName) {
	var needsDB = housingObj.includes("/") ? true : false,
		housingArray = housingObj.split('/'),
		housing, residentsString;

	// get the count first
	if (housingArray[0] !== "tt" && housingArray[0] !== "ll" && housingArray[0] !== "ff") {
		housingCount["cm"]++;
	} else {
		housingCount[housingArray[0]]++;
	}

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
				<span class="userCells usersName">Username: <a href="${userLink}" target="_blank">${username}</a></span>
				<span class="userCells userEnroll">joined: <span>${memberSince}</span></span>
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
		isNPC,
		image;

	Object.keys(characterObj).forEach(function (characterName) {
		character = characterObj[characterName];
		isHybrid = character.isHybrid === "true" ? `<img src="http://orig11.deviantart.net/5717/f/2017/192/d/b/ishybrid_icon_by_toffeebot-dbfzh9l.png">` : "";
		isNPC = character.isNPC === "true" ? `<img src="http://orig13.deviantart.net/d403/f/2017/192/6/7/isnpc_icon_by_toffeebot-dbfzcxu.png">` : "";
		birthday = parseBirthday(character.birthday);
		location = parseLocation(character.housing, characterName);
		image = character.image === "" ? "" : ` style="background-image: url('${character.image}');"`;

		template = `<div class="userInfoItem">
				<div class="userContentHeader">
					${character.name}
				</div>
				<div class="userContent userCharacter">
					<div class="userCharaLeft">
						<div class="userCharaPortrait"${image}></div>
					</div>
					<div class="userCharaRight">
						<div class="userCharaInfo">
							<a href="${character.app}" target="_blank"><img src="http://orig01.deviantart.net/ee76/f/2017/192/a/3/app_icon_by_toffeebot-dbfzcxy.png"></a>
							${isHybrid}
							${isNPC}
						</div>
						<div class="charaHousingInfo">
							<span>birthday: <span>${birthday}</span></span>
							<br><span>job: <span>${character.job}</span></span>
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

function parseLocation(location, characterName = null, residentTitle = null) {
	var template,
		housemates,
		address;

	if (location.residents === undefined) {
		// not an object, would be a shop building
		template = `<br><span>Home Address: <span>${location}</span></span>`;
	} else {
		housemates = getHousemates(location.residents, characterName, residentTitle);
		address = getAddress(location.address, location.address[1] === "cc");
		template = (characterName ? `<br><span>Home Address: <span>${address}</span></span>` : "") + housemates;

		if (!characterName) {
			$("div#dialogTitle").text(address);

			if (housemates === "") {
				return (location.isCommunal ? `<span class="add-center">This room is currently unoccupied!</span></span>` : `<span class="add-center">This lot is unoccupied!<br><span>Make it your home today!</span></span>`);
			}
		}

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

function getAddress(addressArray, numOnly = false) {
	var location,
		number = addressArray[1] === "cc" ? "Captain's Quarters" : addressArray[1];

	if (numOnly) {
		return number;
	}

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

function getHousemates(housematesString, characterName = null, residentTitle = null) {
	var housemateArray = housematesString.split(','),
		newHousemateList = "",
		housemateURL,
		housemateFullLink,
		housemateCount = 0;
	if (housemateArray[0] === "") {
		return "";
	}

	housemateArray.forEach(function(housemateName) {
		if (!characterName || housemateName !== characterName) {
			housemateUrl = characterDB[housemateName].app;
			housemateFullLink = `<a href="${housemateUrl}" target="_blank">${housemateName}</a>`;
			housemateCount ++;

			newHousemateList = newHousemateList === "" ? newHousemateList.concat(housemateFullLink) : newHousemateList.concat(", " + housemateFullLink)
		}
	});

	return newHousemateList !== "" ? (characterName ? "<br><span>Housemate" : (residentTitle ? `<span>${residentTitle}` : "<span>Resident")) + (housemateCount > 1 ? "s" : "") + `: <span>${newHousemateList}</span></span>` : "";
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

function toggleSeasonPrev() {
	var currSeason = parseInt($("td#day1").attr('data-season'));
		newSeason = currSeason === 0 ? 3 : currSeason - 1;

	constructBdayForSeason(newSeason);
}

function toggleSeasonNext() {
	var currSeason = parseInt($("td#day1").attr('data-season')),
		newSeason = currSeason === 3 ? 0 : currSeason + 1;

		constructBdayForSeason(newSeason);
}

function constructBdayForSeason(season) {
	var day = 1,
		seasonTitle = $("span#seasonTitle"),
		seasonColor,
		thead = $(".calendar > thead"),
		header = $(".calendar-header");

	// empty last months displayed bdays
	$('div#bdayList').empty();

	switch (season) {
		case 0:
			seasonTitle.text("spring");
			seasonColor = 'spring-color';
			thead.attr('class', 'spring-color');
			header.attr('class', 'calendar-header spring-background');
			break;
		case 1:
			seasonTitle.text("summer");
			seasonColor = 'summer-color';
			thead.attr('class', 'summer-color');
			header.attr('class', 'calendar-header summer-background');
			break;
		case 2:
			seasonTitle.text("fall");
			seasonColor = 'fall-color';
			thead.attr('class', 'fall-color');
			header.attr('class', 'calendar-header fall-background');
			break;
		default:
			seasonTitle.text("winter");
			seasonColor = 'winter-color';
			thead.attr('class', 'winter-color');
			header.attr('class', 'calendar-header winter-background');
	}

	for (var i = 0; i < 4; i++) {
		for (var j = 0; j < 7; j++) {
			var td = $("td#day" + day);

			td.attr('data-season', season);
			if (bdayDB[season][day-1].length > 0) {
				td.attr('class', 'has-bday ' + seasonColor);
			} else {
				td.attr('class', '');
			}
			day++;
		}
	}
}

function closeDialog() {
	$("div#dialog").hide();
	$("div#overlay-bg").hide();
	$( "body" ).removeClass( "no-scroll" );
}

function openDialog() {
	$("div#dialog").show();
	$("div#overlay-bg").show();
	$( "body" ).addClass( "no-scroll" );
}

function populateHousing() {
	var keys = Object.keys(housingDB),
		startIndex = 0;
		houseKey = "",
		currKeyArr = "",
		housingSplit = {},
		allHousing = [];

	for (var i = 0; i < keys.length; i++) {
		currKeyArr = keys[i].split("/");
		if (currKeyArr[0] !== houseKey || i+1 === keys.length) {
			if (i > 0) {
				housingSplit[houseKey] = keys.slice(startIndex, (i+1 === keys.length ? i+1 : i));
			}

			houseKey = currKeyArr[0];
			allHousing.push(houseKey);
			startIndex = i;
		}
	}

	var houseImageClass, fenceImageClass, key, top;

	for (var h=0; h<allHousing.length; h++) {
		key = allHousing[h];

		if (key === "ai") {
			var innArray = housingSplit[key],
				leftLeft = 5,
				innId, innNum, innData, hasResidents, occupiedImgClass, emptyImgClass,
				rowCounter = 0,
				colCounter = 0;

			for (var i = 0; i<innArray.length; i++) {
				innId = innArray[i];
				innData = housingDB[innId];
				innNum = parseInt(innData.address[1]);
				hasResidents = innData.residents !== "";

				var div = $('<div></div>');
				div.attr('data-id', innId);
				div.text(innNum);

				if (innNum === 101 || innNum === 102) {
					occupiedImgClass = "room-big-ai";
					div.attr('class', "house-button inn-button-big " + occupiedImgClass);

					if (innNum === 101) {
						div.css('top', '251px');
						div.css('left', leftLeft + 'px');	
					} else {
						div.css('top', '53px');	
						div.css('left', leftLeft + 'px');	
					}

					createDialog(div);
				} else if ((innNum >= 103 && innNum <= 107) || (innNum >= 206 && innNum <= 210)) {
					colCounter = 0;
					occupiedImgClass = "room-top-ai";
					emptyImgClass = "empty-top-ai";
					div.attr('class', "house-button inn-button-top " + (hasResidents ? occupiedImgClass : emptyImgClass));
					div.css('top', '5px');
					div.css('left', leftLeft + 1 + (51 * rowCounter) + 'px');
					rowCounter ++;

					if (innNum === 104 || innNum === 105) {
						createDialog(div);
					} else {
						createDialog(div, "Tenant");
					}
				} else {
					rowCounter = 0;
					occupiedImgClass = "room-side-ai";
					emptyImgClass = "empty-side-ai";
					div.attr('class', "house-button inn-button-side " + (hasResidents ? occupiedImgClass : emptyImgClass));

					if (innNum >= 201 && innNum <= 205) {
						div.css('left', leftLeft + 'px');
						div.css('top', 279 - (51 * colCounter) + (innNum > 203 ? -22 : 0) + 'px');
					} else {
						div.css('left', 236 + 'px');
						div.css('top', 53 + (51 * colCounter) + (innNum > 212 ? 22 : 0) + 'px');
					}

					colCounter ++;
					createDialog(div, "Tenant");
				}

				if (innNum < 200) {
					$('div#map-ai-1').append(div);
				} else {
					$('div#map-ai-2').append(div);
				}
			}
		} else if (key === "ss") {
			var ssArray = housingSplit[key],
				ssId, ssNum, ssData, hasResidents, occupiedImgClass, emptyImgClass,
				leftCounter = 0,
				rightCounter = 0;

			for (var i = 0; i<ssArray.length; i++) {
				ssId = ssArray[i];
				ssData = housingDB[ssId];
				ssNum = ssData.address[1] === "cc" ? 0 : parseInt(ssData.address[1]);
				hasResidents = ssData.residents !== "";

				var div = $('<div></div>');
				div.attr('data-id', ssId);
				div.text(ssNum);

				if (ssNum === 0) {
					occupiedImgClass = "room-big-ss";
					div.attr('class', "house-button ss-button-big " + occupiedImgClass);

					div.css('top', '6px');
					div.css('left', '217px');	
					div.html("captain's<br>quarters");

					createDialog(div);
				} else {
					occupiedImgClass = "room-side-ss";
					emptyImgClass = "empty-side-ss";
					div.attr('class', "house-button ss-button-side " + (hasResidents ? occupiedImgClass : emptyImgClass));

					if ((ssNum >= 6 && ssNum <= 10) || (ssNum >= 14 && ssNum <= 16)) {
						rightCounter = 0;
						div.css('left', '5px');

						if (ssNum >= 6 && ssNum <= 10) {
							div.css('top', 93 + (32 * leftCounter) + 'px');
						} else {
							div.css('top', 157 + (32 * leftCounter) + 'px');
						}
						leftCounter ++;
					} else {
						leftCounter = 0;
						div.css('left', '217px');

						if (ssNum >= 1 && ssNum <= 5) {
							div.css('top', 93 + (32 * rightCounter) + 'px');
						} else {
							div.css('top', 157 + (32 * rightCounter) + 'px');
						}
						rightCounter ++;
						
					}
					createDialog(div, "Tenant");
				}

				if (ssNum >= 11) {
					$('div#map-ss-1').append(div);
				} else {
					$('div#map-ss-2').append(div);
				}
			}
		} else {
			for (var i = 0; i<6; i++) {
				if (i%2 === 0) {
					houseImageClass = 'house-top-' + key;
					fenceImageClass = 'fence-top-' + key;
				} else {
					houseImageClass = 'house-bottom-' + key;
					fenceImageClass = 'fence-bottom-' + key;
				}

				top = (25 + 50*i);

				for (var j = 0; j < 9; j++) {
					var div = $('<div></div>'),
						houseId = housingSplit[key][i*9 + j],
						houseData = housingDB[houseId],
						houseNum = houseData.address[1],
						hasResidents = houseData.residents !== "";

					div.attr('data-id', houseId);
					div.attr('class', "house-button " + (hasResidents ? houseImageClass : fenceImageClass));
					div.text(houseNum);
					div.css('top', top + 'px');

					if (j < 2) {
						div.css('left', (40 + 25*j) + 'px');
					} else if (j < 7 ) {
						div.css('left', (40 + 25 + 25*j) + 'px');
					} else {
						div.css('left', (40 + 25 + 25 + 25*j) + 'px');
					}

					createDialog(div);

					$('div#map-' + key).append(div);
				}
			}
		}
	}
}

function createDialog(div, residentTitle = null) {
	div.on( 'click', function( ev ){
		var house = $(this).attr('data-id'),
			template = parseLocation(housingDB[house], undefined, residentTitle);

		$("div#charaHousingInfo").empty().append(template);
		openDialog();
	});
}

function calculateFP() {
	// Clear displayed inputs
	$("div#fp-total").text("");
	$("div#fp-error-message").text("");

	if ($("#fp-canon").val() === "false") {
		$("div#fp-error-message").text("Only canon interactions can earn FP.");
		return;
	}

	// collect int input
	var eventBonus = $("#fp-event").val().replace(",", ""),
		etcBonus = $("#fp-etc").val().replace(",", ""),
		collabBonus, rpBonus, hqBonus, bdayBonus, itemBonus, total;

	if (eventBonus === "") {
		eventBonus = 0;
	} else {
		eventBonus = parseInt(eventBonus, 10);
	}

	if (etcBonus === "") {
		etcBonus = 0;
	} else {
		etcBonus = parseInt(etcBonus, 10);
	}

	if(isNaN(eventBonus)) {
		$("div#fp-error-message").text("Your event bonus input is incorrect. Please only use numbers, no commas or special characters!");
		return;
	}

	if(isNaN(etcBonus)) {
		$("div#fp-error-message").text("Your additional bonus input is incorrect. Please only use numbers, no commas or special characters!");
		return;
	}

	// get rest of inputs
	collabBonus = $("#fp-collab").val() === "true" ? 200 : 0;
	rpBonus = $("#fp-rp").val() === "true" ? 200 : 0;
	hqBonus = $("#fp-hq").val() === "true" ? 300 : 0;
	bdayBonus = $("#fp-bday").val() === "true" ? 2 : 1;
	itemBonus = parseInt($("#fp-item").val(), 10);

	if(bdayBonus === 2 && eventBonus > 0) {
		$("div#fp-error-message").text("You can't apply the birthday bonus and the festival/mini event bonus to the same submission, as a birthday is a special event of its own.");
		return;
	}

	if(hqBonus === 300 && eventBonus > 0) {
		$("div#fp-error-message").text("You can't apply the heart event bonus and the festival/mini event bonus to the same submission, as a heart event is a special event of its own.");
		return;
	}

	if(bdayBonus === 2 && hqBonus === 300) {
		$("div#fp-error-message").text("You can't apply the birthday bonus and the heart event bonus to the same submission, as a birthday is a special event of its own.");
		return;
	}

	// calculate
	total = (200 + collabBonus + rpBonus) * bdayBonus + hqBonus + itemBonus + eventBonus + etcBonus;

	$("div#fp-total").text(total + " fp");
}

function calculateRP() {
	// Clear displayed inputs
	$("div#rp-total").text("");
	$("div#rp-error-message").text("");

	var numRpers = $("#rp-num").val().replace(",", ""),
		wordCount = $("#rp-wc").val().replace(",", ""),
		total;
	
	if (numRpers === "") {
		numRpers = 0;
	} else {
		numRpers = parseInt(numRpers, 10);
	}

	if (wordCount === "") {
		wordCount = 0;
	} else {
		wordCount = parseInt(wordCount, 10);
	}

	if(isNaN(numRpers)) {
		$("div#rp-error-message").text("Your number of participants input is incorrect. Please only use numbers, no commas or special characters!");
		return;
	}

	if(isNaN(wordCount)) {
		$("div#rp-error-message").text("Your word count input is incorrect. Please only use numbers, no commas or special characters!");
		return;
	}

	if (numRpers < 1) {
		$("div#rp-error-message").text("There has to be at least one user participating in the rp!");
		return;
	}

	if (wordCount < 1000) {
		$("div#rp-error-message").text("A roleplay log must be at least 1000 words to be counted for gold!");
		return;
	}

	// calculate
	total = Math.floor(wordCount / numRpers / 10 / 25) * 25;

	$("div#rp-total").text(total + "g");
}