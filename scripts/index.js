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
var userDB = {
		"reference": {
			"memories": {}
		}
	},
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
		}),
		$.ajax({
			url: 'https://spreadsheets.google.com/feeds/list/12rNhHS0HsSpKjfovyb26ZQ4x4eOA_2rbLDMC7uc5R1s/o9sjc7b/public/values?alt=json-in-script',
			dataType: 'jsonp'
		}),
		$.ajax({
			url: 'https://spreadsheets.google.com/feeds/list/1MZEVM8nWfmyhxDIWvib0trVLmOFK79f2SIBAJDidMRI/od6/public/values?alt=json-in-script',
			dataType: 'jsonp'
		})
	)
	.done((main, housing, jobList, submissions, memories) => compileData(main, housing, jobList, submissions, memories));
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
function compileData (main, housing, jobList, submissions, memories) {
	// If something messed up here, stop processing.
	if (!main[0] || !housing[0] || !jobList[0] || !submissions[0] || !memories[0]) {
		return;
	}

	createBdayDB();

	var mainFeed = main[0].feed,
		housingFeed = housing[0].feed,
		jobFeed = jobList[0].feed,
		submissionsFeed = submissions[0].feed,
		memoriesFeed = memories[0].feed,
		mainRows = mainFeed.entry || [],
		housingRows = housingFeed.entry || [],
		jobRows = jobFeed.entry || [],
		submissionsRows = submissionsFeed.entry || [],
		memoriesRows = memoriesFeed.entry || [];

	createJobDB(jobRows);

	// Populate housing DB
	housingRows.forEach(function(row) {
		var rowAddress = row['gsx$address'].$t,
			rowAddressArray = rowAddress.split('/'),
			rowHasPaint = row['gsx$haspaint'].$t,
			rowHasBathroom = row['gsx$hasbathroom'].$t,
			rowHasKitchen = row['gsx$haskitchen'].$t,
			rowHasRoomA = row['gsx$hasrooma'].$t,
			rowImg = row['gsx$img'].$t;

		housingDB[rowAddress] = {
			address: rowAddressArray,
			isCommunal: (rowAddressArray[0] === "ai" || rowAddressArray[0] === "ss"),
			residents: "",
			hasPaint: rowHasPaint,
			hasBathroom: rowHasBathroom,
			hasKitchen: rowHasKitchen,
			hasRoomA: rowHasRoomA,
			img: rowImg
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
			characters: rowCharacters,
			memories: {},
			submissions: []
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

			$("div#add-memory-button").on( 'click', function( ev ){
				var user = $(this).attr('data-id');

				if (!user || user === "") {
					// uh oh
					return;
				}

				$("div#memory-title").text("unlock memory badges for " + user);
				$("input#memory-user").val(user);
				populateMemoriesRemaining(userDB[user].memories);
				$("input#memory-link").val("");
				$("div#submit-memory-error").empty();
				$("div#submit-memory-result").empty();
				$("div#memory-form").css("display", "block");

				$.mobile.changePage('#addmemory', {transition:'none'});
			});
			$.mobile.changePage('#view', {transition:'none'});
		});

		$('div#member-container').append(div);
	}, this);
	
	// Populate memories
	memoriesRows.forEach(function(row) {
		var rowKeys = Object.keys(row).filter(function(name) { return name.startsWith("gsx$") && name !== "gsx$user" }),
			user = row['gsx$user'].$t,
			key;

		for (var i = 0; i< rowKeys.length; i++) {
			key = rowKeys[i].substring(4);
			userDB[user]["memories"][key] = (row[rowKeys[i]].$t).split(',');
		}
	});

	// Populate submissions
	submissionsRows.forEach(function(row) {
		var users = (row['gsx$usernames'].$t).split(','),
			date = row['gsx$date'].$t,
			title = row['gsx$title'].$t,
			gold = row ['gsx$gold'].$t,
			link = row['gsx$submission'].$t,
			linkApproved = false;

		if (title !== "") {
			linkApproved = true;
		} else {
			title = "pending approval";
		}

		for (var i = 0; i < users.length; i++) {
			userDB[users[i]].submissions.push([linkApproved,title,gold,link,date]);
		}
	});

	// Construct the calendar
	createInitialCalendar();

	// Populate housing
	populateHousing();

	// Populate list for add gold
	populateUserList();

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
	$('form > button').on('click', function(e){
-		e.preventDefault();
	});

	$("select#memory-memory").on("change", function(e){
		var selectedKey = e.currentTarget.value;
		if (selectedKey === "") {
			$("div#memory-image").empty();
			return;
		}
		$("div#memory-image").html(`<img src="${userDB["reference"]["memories"][selectedKey][1]}">`);
	});

	$(document).on("pagehide","#addmemory",function(){
		$("div#memory-form").css("display", "none");
	});

	// Show page
	$("#loader").delay(1500).slideToggle("slow");
}

function populateMemoriesRemaining(memoriesList) {
	var memoryKeys = Object.keys(memoriesList),
		memoryArray,
		key,
		memoryOptionsString = `<option value="" selected></option>`;

	for (var i = 0; i< memoryKeys.length; i++) {
		key = memoryKeys[i],
		memoryArray = memoriesList[key];

		if (memoryArray[0] !== "") {
			continue;
		}

		memoryOptionsString += `<option value="${key}">${userDB["reference"]["memories"][key][0]}</option>`;
	}

	$("div#memory-image").empty();
	$("select#memory-memory").empty().append(memoryOptionsString);
	$('select#memory-memory').trigger('change');
}

function populateUserList() {
	var userList = Object.keys(userDB).filter(function(user){
			return user !== "reference"
		}),
		optionsString = "";

	userList.forEach(function(user) {
		optionsString += `<option value="${user}">${user}</option>`;
	});

	$("select#submit-userList").append(optionsString);
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
				image: characterArray[7],
				wikia: characterArray[8] ? characterArray[8] : ""
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
		memoriesData = appendMemoryInfo(userData.memories),
		userCharacterData = appendCharacterInfo(userData.characters),
		submissionsList = userData.submissions.length === 0 ? "" : appendSubmissions(userData.submissions),
	  	div = document.createElement('div');

		div.className = 'cell-outer';
		div.innerHTML = `
		<div class="userInfoItem">
			<div class="userContentHeader">
				stats
			</div>
			<div class="userContent userStats padding-bottom-short" id="userStats">
				<span class="userCells usersName">Username: <a href="${userLink}" target="_blank">${username}</a></span>
				<span class="userCells userEnroll">joined: <span>${memberSince}</span></span>
				${memoriesData}
				<div class="clear"></div>
				<div class="add-memory-button" data-id="${username}" id="add-memory-button"><img src="https://orig13.deviantart.net/b737/f/2017/210/c/8/addbtn_by_toffeebot-dbi6ojd.png"></div>
				<div class="clear"></div>
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
				${submissionsList}
				<hr/>
				<span class="userGoldTotal">Total: ${userTotal}</span>
				<div class="clear"></div>
			</div>
		</div>
		${userCharacterData}`;

	return div;
}

function appendMemoryInfo (memoriesList) {
	var memoryKeys = Object.keys(memoriesList),
		collectedMemoriesList = "",
		key,
		memory;

	for (var i = 0; i < memoryKeys.length; i++) {
		key = memoryKeys[i];
		memory = memoriesList[key];

		// Not populated, skip.
		if (memory[0] === "") {
			continue;
		}

		if (memory[0] === "valid") {
			collectedMemoriesList += `<a href="${memory[1]}" target="_blank"><img src="${userDB["reference"]["memories"][key][1]}"></a>`;
		} else {
			collectedMemoriesList += `<img src="${userDB["reference"]["memories"][key][1]}">`;
		}
	}

	return (collectedMemoriesList === "" ? "" : `<hr/><span class="userCells userMemories">${collectedMemoriesList}</span>`);
}

function appendSubmissions(submissionsList) {
	var submissionLink,
		submissionsString = "",
		submissionDate = "",
		submissionLastDate = new Date(submissionsList[submissionsList.length-1][4]).toLocaleString();

	submissionsList.forEach(function(submission) {
		submissionDate = new Date(submission[4]).toLocaleString();
		submissionLink = submission[0] ? `<a href="${submission[3]}" target="_blank">${submission[1]}</a>` : `${submission[1]}`;
		submissionsString += `<li class=""><span class="brown-color">${submission[2]}g</span><br>${submissionLink}<br>Submitted: <span class="spring-color">${submissionDate}</span></li>`;
	});


//<span class="userCells userSpendings">Spent: ${userSpent}</span>
	return `<span class="userCells userSubmissionDate">Last submission: <span>${submissionLastDate}</span></span><div class="submissionsList"><ul>${submissionsString}</ul></div>`;
}

function appendCharacterInfo (characterObj) {
	var template,
		compiledTemplate = "",
		character,
		birthday,
		location,
		hasWikia,
		isHybrid,
		isNPC,
		image;

	Object.keys(characterObj).forEach(function (characterName) {
		character = characterObj[characterName];
		isHybrid = character.isHybrid === "true" ? `<img src="http://orig11.deviantart.net/5717/f/2017/192/d/b/ishybrid_icon_by_toffeebot-dbfzh9l.png">` : "";
		isNPC = character.isNPC === "true" ? `<img src="http://orig13.deviantart.net/d403/f/2017/192/6/7/isnpc_icon_by_toffeebot-dbfzcxu.png">` : "";
		hasWikia = character.wikia !== "" ? `<a href="${character.wikia}" target="_blank"><img src="https://orig10.deviantart.net/3021/f/2017/210/7/6/wikiabtn_by_toffeebot-dbi3upx.png"></a>` : "";
		birthday = parseBirthday(character.birthday);
		location = parseLocation(character.housing, characterName);
		image = ` style="background-image: url('${character.image}');"`;

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
							${hasWikia}
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

function submitGold() {
	$("div#submit-gold-error").empty();
	$("div#submit-gold-result").empty();

	var usernames = $("textarea#gold-users").val(),
		gold = parseInt($("input#gold-gold").val().replace(",", "")),
		link = $("input#gold-link").val().toLowerCase();

	// handle error
	if (usernames === "") {
		$("div#submit-gold-error").text("Please select at least one user!");
		return;
	}

	if (isNaN(gold)) {
		$("div#submit-gold-error").text("Your gold input is incorrect. Please only use numbers, no text or special characters!");
		return;
	}

	if (gold%25 !== 0) {
		var fixed = Math.floor(gold / 25) * 25;
		$("div#submit-gold-error").html(`Your gold calculation is incorrect. The gold total should be a factor of 25.<br><span class="winter-color">Did you mean ${fixed}?</span>`);
		$("input#gold-gold").val(fixed);
		return;
	}

	if (!isAcceptedLink(link)) {
		$("div#submit-gold-error").text("You did not enter a proper url or your submission is not from a site we accept. Please try again or contact the admin.");
		return;
	}

	// disable submit button while waiting
	enableButtonGold(false);
    $.get("https://script.google.com/macros/s/AKfycbwakI6-PGan8xiH9Z7wt3LQriogpIwjr2rzk93GsScClg5_4zs/exec", {
            "usernames": usernames,
            "gold": gold,
            "submission": link 
        },
        function(data) {
			$("textarea#gold-users").val("");
			$("input#gold-gold").val("");
			$("input#gold-link").val("");

			var users = usernames.split(",");
			users.forEach(function(user) {
				userDB[user].submissions.push([false,"pending approval",gold,link,new Date().toISOString()]);
			});

			enableButtonGold(true);
			$("div#submit-gold-result").text("your submission was received! Please check your user page to make sure it was added.");
		}) 
		.fail(function (error) {
			enableButtonGold(true);
			$("div#submit-gold-error").text("something went wrong. please check your internet connection and try again later.");
		}
    );
}

function submitMemory() {
	$("div#submit-memory-error").empty();
	$("div#submit-memory-result").empty();

	var user = $("input#memory-user").val(),
		key = $("select#memory-memory").val(),
		link = $("input#memory-link").val().toLowerCase(),
		value;

	// handle error
	if (key === "") {
		$("div#submit-memory-error").text("Please select a memory badge to be claimed.");
		return;
	}

	if (!isAcceptedLink(link)) {
		$("div#submit-memory-error").text("You did not enter a proper url or your submission is not from a site we accept. Please try again or contact the admin.");
		return;
	}
	value = "true," + link;

	// disable submit button while waiting
	enableButtonMemory(false);
    $.get("https://script.google.com/macros/s/AKfycby7s6yUPlZ5Rt7h4Auyrg7sl4H_AAOuLw6UN7X0fzZIsNoXevpy/exec", {
			"key": key,
			"user": user,
			"value": value
        },
        function(data) {
			$("input#memory-link").val("");
			userDB[user]["memories"][key] = ["true", link];
			populateMemoriesRemaining(userDB[user].memories);

			enableButtonMemory(true);
			$("div#submit-memory-result").text("your proof was received! Please check your user page to make sure it was added.");
		}) 
		.fail(function (error) {
			enableButtonMemory(true);
			$("div#submit-memory-error").text("something went wrong. please check your internet connection and try again later.");
		}
    );
}

function isAcceptedLink(string) {
	var acceptedMedia = ["://pbs.twimg.com/",
						"://twitter.com/",
						".tumblr.com/",
						"://fav.me/",
						".deviantart.com/art/",
						"://docs.google.com/document/d/",
						"://drive.google.com/open?id=",
						"://sta.sh/"];

	if (!string.startsWith("http")) {
		return false;
	}

	for (var i = 0; i < acceptedMedia.length; i++) {
		if (string.indexOf(acceptedMedia[i]) > -1) {
			return true;
		}
	}
	return false;
}

function enableButtonGold(enable) {
	if (enable) {
		$("button#submitGoldBtn").text("submit");
		$("button#submitGoldBtn").prop("disabled", false);
	} else {
		$("button#submitGoldBtn").text("please wait");
		$("button#submitGoldBtn").prop("disabled", true);
	}
}

function enableButtonMemory(enable) {
	if (enable) {
		$("button#submitMemoryBtn").text("submit");
		$("button#submitMemoryBtn").prop("disabled", false);
	} else {
		$("button#submitMemoryBtn").text("please wait");
		$("button#submitMemoryBtn").prop("disabled", true);
	}
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

		if (housingDB[house].img !== "") {
			$("div#dialog-portrait").css('background-image', `url('${housingDB[house].img}')`);
		} else {
			$("div#dialog-portrait").css('background-image', `url("https://orig13.deviantart.net/7c0f/f/2017/191/1/c/bg_by_toffeebot-dbfv43o.png")`);
		}

		$("div#housingInfo").empty().append(template);
		openDialog();
	});
}

function calculateFP() {
	// Clear displayed inputs
	$("div#fp-total").empty();
	$("div#fp-error-message").empty();

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
		$("div#fp-error-message").text("Your event bonus input is incorrect. Please only use numbers, no text or special characters!");
		return;
	}

	if(isNaN(etcBonus)) {
		$("div#fp-error-message").text("Your additional bonus input is incorrect. Please only use numbers, no text or special characters!");
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
	$("div#rp-total").empty();
	$("div#rp-error-message").empty();

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
		$("div#rp-error-message").text("Your number of participants input is incorrect. Please only use numbers, no text or special characters!");
		return;
	}

	if(isNaN(wordCount)) {
		$("div#rp-error-message").text("Your word count input is incorrect. Please only use numbers, no text or special characters!");
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

function clearUsernames() {
	$("div#submit-gold-error").empty();
	$("div#submit-gold-result").empty();
	$("textarea#gold-users").val("");
}

function addUsername() {
	$("div#submit-gold-error").empty();
	$("div#submit-gold-result").empty();

	var user = $("select#submit-userList").val(),
		currentUsers = $("textarea#gold-users").val();

	if (user === "") {
		return; // no user, we're done
	}

	if (currentUsers.indexOf(user) > -1) {
		$("div#submit-gold-error").text("You've already added that user!");
		return;
	}
	$("textarea#gold-users").val(currentUsers === "" ? user : currentUsers.concat("," + user));
}