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
	itemDB = {},
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
		}),
		$.ajax({
			url: 'https://spreadsheets.google.com/feeds/list/1QtrZ8TdV9NayyXquBMhp-3ywwIjjMhQoJwmMBynZTjU/od6/public/values?alt=json-in-script',
			dataType: 'jsonp'
		})
	)
	.done(function(main, housing, jobList, submissions, memories, items) {compileData(main, housing, jobList, submissions, memories, items);});
  });

// Resize the background
function resizeBackground() {
	var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

	$( ".ui-content" ).each(function() { $( this ).height(window.innerHeight - 76 + (isIOS && window.innerWidth > window.innerHeight ? 78 : 0)); });
	roundCssTransformMatrix("dialog");
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
function compileData (main, housing, jobList, submissions, memories, items) {
	// If something messed up here, stop processing.
	if (!main[0] || !housing[0] || !jobList[0] || !submissions[0] || !memories[0] || !items[0]) {
		return;
	}

	createBdayDB();

	var mainFeed = main[0].feed,
		housingFeed = housing[0].feed,
		jobFeed = jobList[0].feed,
		submissionsFeed = submissions[0].feed,
		memoriesFeed = memories[0].feed,
		itemsFeed = items[0].feed,
		mainRows = mainFeed.entry || [],
		housingRows = housingFeed.entry || [],
		jobRows = jobFeed.entry || [],
		submissionsRows = submissionsFeed.entry || [],
		memoriesRows = memoriesFeed.entry || [],
		itemsRows = itemsFeed.entry || [];

	createJobDB(jobRows);
	createItemDB(itemsRows);
	createHouseDB(housingRows);
	buildUserPages(mainRows);
	buildShopPages();

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
	submissionsRows.reverse();
	submissionsRows.forEach(function(row) {
		var users = (row['gsx$usernames'].$t).split(','),
			date = row['gsx$date'].$t,
			title = row['gsx$title'].$t,
			gold = parseInt(row['gsx$gold'].$t),
			link = row['gsx$submission'].$t,
			linkApproved = false;

		if (title !== "") {
			linkApproved = true;
		} else {
			title = "pending approval";
		}

		for (var i = 0; i < users.length; i++) {
			if (userDB[users[i]]) {
				//prevent issues with removed users
				userDB[users[i]].submissions.push([linkApproved,title,gold,link,date]);
			}
		}
	});

	// Construct the calendar
	createInitialCalendar();

	// Construct the shops page
	createShopsPage();

	// Populate housing
	populateHousing();

	// Populate list for add gold
	populateUserList();

	$("span#charaCount").text(characterCount);

	var hybrid = getPercentage(hybridCount);

	$("span#humanRatio").text("are human: " + (100 - hybrid).toFixed(1) + "%");
	$("span#hybridRatio").text("are non-human: " + hybrid + "%");
	$("span#npcRatio").text("are secondary characters: " + getPercentage(npcCount) + "%");

	var spring = getPercentage(bdayCount[0]),
		summer = getPercentage(bdayCount[1]),
		fall = getPercentage(bdayCount[2]);

	$("span#bday-spring").text("were born in spring: " + spring + "%");
	$("span#bday-summer").text("were born in summer: " + summer + "%");
	$("span#bday-fall").text("were born in fall: " + fall + "%");
	$("span#bday-winter").text("were born in winter: " + (100 - spring - summer - fall).toFixed(1) + "%");

	var tt = getPercentage(housingCount["tt"]),
		ll = getPercentage(housingCount["ll"]),
		ff = getPercentage(housingCount["ff"]);

	$("span#home-tt").text("moved to toffee town's residential area: " + tt + "%");
	$("span#home-ll").text("moved to lemon lake's residential area: " + ll + "%");
	$("span#home-ff").text("moved to flan forest's residential area: " + ff + "%");
	$("span#home-res").text("stayed in shop residence or provided lodging: " + (100 - tt - ll - ff).toFixed(1) + "%");

	// REMOVE LATER
	$('form > button').on('click', function(e){
-		e.preventDefault();
	});

	$("select#memory-memory").on("change", function(e){
		var selectedKey = e.currentTarget.value;
		if (selectedKey === "") {
			$("div#memory-image").empty();
			$("div#memory-obtain").empty();
			$("label#memory-selected-title").empty();
			return;
		}

		$("label#memory-selected-title").html(`<span>${userDB["reference"]["memories"][selectedKey][0]}</span>`);
		$("div#memory-image").html(`<img src="${userDB["reference"]["memories"][selectedKey][1]}">`);
		$("div#memory-obtain").html(`<span class="spring-color">How to obtain:</span> ${userDB["reference"]["memories"][selectedKey][2]}`);
	});

	$(document).on("pagehide","#addmemory",function(){
		$("div#memory-form").css("display", "none");
	});

	// Show page
	$("#loader").delay(1500).slideToggle("slow");
}

function createItemDB(rawData) {
	var key,
		shop;

	rawData.forEach(function(row) {
		key = row['gsx$key'].$t,
		shop = itemDB[key];		
		if (!shop) {
			shop = {};
		}

		shop[(row['gsx$name'].$t).toLowerCase()] = {
			image: row['gsx$image'].$t,
			artist: row['gsx$artist'].$t,
			price: row['gsx$price'].$t,
			currency: row['gsx$currency'].$t || "G",
			desc: row['gsx$desc'].$t
		};

		itemDB[key] = shop;
	});
}

function buildUserPages(mainRows) {
	var skipLinks = "<a data-ajax='false' href='#userTop'>a</a>",
		charCode = 97; // a

	mainRows.forEach(function(row) {
		var rowUsername = row['gsx$username'].$t,
			rowImg = row['gsx$img'].$t !== "" ? row['gsx$img'].$t : "https://orig09.deviantart.net/b2eb/f/2017/191/c/0/px_blank_by_toffeebot-dbfv3db.png",
			rowEnroll = getActiveSinceDate(row['gsx$enroll'].$t),
			rowGold = parseInt(row['gsx$gross'].$t),
			rowSpending = parseInt(row['gsx$spending'].$t),
			rowTotal = rowGold + rowSpending,
			rowCharacters = getCharacterArray(row, parseInt(row['gsx$enroll'].$t)),
			div = document.createElement('div'),
			anchor;

		if (rowUsername.charCodeAt(0) > charCode) {
			skipLinks += `<a data-ajax="false" href="#${rowUsername}">${rowUsername.charAt(0)}</a>`;
			anchor = document.createElement('a');
			anchor.className = "anchor";
			anchor.id = rowUsername;
			charCode = rowUsername.charCodeAt(0);
		}

		userDB[rowUsername] = {
			username: rowUsername,
			img: rowImg,
			enroll: rowEnroll,
			gold: rowGold,
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

				$("div#memory-title").text(user);
				$("input#memory-user").val(user);
				populateMemoriesRemaining(userDB[user].memories);
				$("input#memory-link").val("");
				$("div#submit-memory-error").empty();
				$("div#submit-memory-result").empty();
				$("div#memory-form").css("display", "block");

				$.mobile.changePage('#addmemory', {transition:'slide'});
			});
			$.mobile.changePage('#view', {transition:'slide'});
		});
		$('div#member-list').append(div);
		if (anchor) {
			$('div#member-list').append(anchor);
		}
	}, this);

	$('div#skipToUser').html(skipLinks);
}

function buildShopPages() {
	Object.keys(jobDB).forEach(function(rowKey) {
		var row = jobDB[rowKey],
			div = document.createElement('div');

		div.className = 'cell-outer';
		div.innerHTML = `<a href="#" id="userCell" data-id="${rowKey}">
							<div class="image shop-buttons" role="image">${row.building}</div>
						</a>`;

		$('a#userCell', div ).on( 'click', function( ev ){
			var shopkey = ev.currentTarget.dataset['id'],
				pageContent = appendShopInfo(shopkey);
			
			$('div#jobInfo').empty().append(pageContent);
			$.mobile.changePage('#view-job', {transition:'slide'});
		});

		$('div#job-list').append(div);
	}, this);
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
		let key = row['gsx$key'].$t;

		if (key === "o" || key === "c") {
			// independents / civilians
			jobDB[key] = {
				building: row['gsx$building'].$t,
				desc: row['gsx$desc'].$t,
				characters: []
			}
		} else {
			jobDB[key] = {
				building: row['gsx$building'].$t,
				job1: { name: row['gsx$job1'].$t, characters: []},
				job2: { name: row['gsx$job2'].$t, characters: []},
				job3: { name: row['gsx$job3'].$t, characters: []},
				area: row['gsx$area'].$t,
				hours: row['gsx$hours'].$t,
				desc: row['gsx$desc'].$t,
				img: row['gsx$image'].$t,
				artist: row['gsx$artist'].$t
			}
		}
	});
}

function createHouseDB(houseRows) {
	// Populate housing DB
	houseRows.forEach(function(row) {
		var rowAddress = row['gsx$address'].$t,
			rowAddressArray = rowAddress.split('/');

		housingDB[rowAddress] = {
			address: rowAddressArray,
			isCommunal: (rowAddressArray[0] === "ai" || rowAddressArray[0] === "ss"),
			residents: "",
			level: row['gsx$level'].$t,
			hasPaint: row['gsx$haspaint'].$t,
			hasDesign: row['gsx$hasdesign'].$t,
			hasBathroom: row['gsx$hasbathroom'].$t,
			hasKitchen: row['gsx$haskitchen'].$t,
			hasBalcony: row['gsx$hasbalcony'].$t,
			hasAttic: row['gsx$hasattic'].$t,
			hasPond: row['gsx$haspond'].$t,
			hasCoop: row['gsx$hascoop'].$t,
			addRooms: row['gsx$addrooms'].$t,
			img: row['gsx$img'].$t
		}
	});
}

function createShopsPage() {
	var skipLinks = "<a data-ajax='false' href='#itemTop'>a</a>",
		charCode = 97;

	Object.keys(itemDB).forEach (function(key) {
		var titleDiv = $('<div></div>'),
			itemsDiv = $('<div></div>'),
			buildingName = jobDB[key] ? jobDB[key].building : key,
			items = itemDB[key],
			anchor,
			additionalInfo;

		if (buildingName.charCodeAt(0) > charCode) {
			skipLinks += `<a data-ajax="false" href="#${buildingName}">${buildingName.charAt(0)}</a>`;
			anchor = document.createElement('a');
			anchor.className = "anchor";
			anchor.id = buildingName;
			charCode = buildingName.charCodeAt(0);
			$('div#itemsContainer').append(anchor);
		}

		titleDiv.attr('class', "marketShopName");
		titleDiv.html(buildingName);
		$('div#itemsContainer').append(titleDiv);

		if (buildingName === "eclair station") {
			additionalInfo = `Train tickets are to be purchased if you'd like canon events to occur in other places outside of the Toffee Town region, and also if you'd like to shop at Fortune Fair.
			The train ticket home and train ticket to Toffee Town will also allow you to submit images depicting non-official npcs for gold (when they are out of town or when someone is visiting).`;
		}

		if (buildingName === "fortune fair") {
			additionalInfo = `A fortune fair train ticket is required to visit the fair and purchase these items.`;
		}

		if (buildingName === "puff-puff pet mart") {
			additionalInfo = `To decide dog size, see the following links: <a href="http://dogtime.com/dog-breeds/characteristics/small/" target="_blank">small</a>, <a href="http://dogtime.com/dog-breeds/characteristics/medium/" target="_blank">medium</a>, <a href="http://dogtime.com/dog-breeds/characteristics/size/" target="_blank">large</a>. If the breed is not there, decide based on its size vs other dogs.
			<br>Birds must be domestic <a href="http://www.allpetbirds.com/types-of-pet-birds/" target="_blank">(see list)</a>. One exception is the falcon (counts as large bird).
			<br>Common farm animals may be purchased at the ranch.`;
		}

		if (buildingName === "souffle smithy") {
			additionalInfo = `The weapon certification quest must be completed before weapons can be purchased.`;
		}

		if (additionalInfo) {
			var additionalDiv = $('<div></div>');

			additionalDiv.attr('class', "marketShopInfo");
			additionalDiv.html(additionalInfo);
			$('div#itemsContainer').append(additionalDiv);
		}

		itemsDiv.attr('class', "marketItemsContainer");
		Object.keys(items).forEach(function(itemName) {
			var item = items[itemName],
				itemDiv = $('<div></div>');

			itemDiv.attr('class', "itemDiv");
			itemDiv.attr('data-id', itemName);
			itemDiv.attr('data-key', key);
			itemDiv.html(`
				<div class="itemPic"><img src="${item.image}"></div>
				<div class="itemName">${itemName}</div>
				<div class="itemPrice">${parseInt(item.price).toLocaleString()} ${item.currency}</div>
			`);

			createDialog(itemDiv, null, true)
			itemsDiv.append(itemDiv);
		});

		$('div#itemsContainer').append(itemsDiv);
	});

	$('div#skipToItem').html(skipLinks);
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
	var bdayArray = bdayDB[season][day],
		birthdate = parseBirthday([parseInt(season)+1+"", parseInt(day)+1]) + " birthdays";

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
					${birthdate}
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

function getCharacterArray(row, enrollNum) {
	var characters = {},
		characterNum,
		characterString,
		characterArray,
		characterName,
		characterBirthday;

	for (var i = 1; i <= 10; i++) {
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
				job: getJob(characterArray[6].split('/'), characterName),
				image: characterArray[7],
				tracker: characterArray[8] ? characterArray[8] : "",
				enroll: enrollNum
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

function getJob(jobArray, name) {
	if (jobArray.length === 1) {
		let isIndependent = jobArray[0] !== "";

		if (isIndependent) {
			jobDB["o"].characters.push(name);
		} else {
			jobDB["c"].characters.push(name);
		}
		return isIndependent ? jobArray[0] : "n/a (civilian)";
	}

	let job = jobDB[jobArray[0]]["job" + jobArray[1]];
	job.characters.push(name);

	return job["name"];
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
	  	userLink = `https://${username}.deviantart.com/`,
	  	userGross = userData.gold,
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
				<div class="add-memory-button" data-id="${username}" id="add-memory-button"><img class="image-shadow" src="https://orig10.deviantart.net/51df/f/2017/224/0/2/addbtn_by_toffeebot-dbjsi7w.png"></div>
				<div class="clear"></div>
			</div>
		</div>
		<div class="userInfoItem">
			<div class="userContentHeader">
				gold
			</div>
			<div class="userContent userGold" id="userGold">
				<span class="userCells userGross">Earned: ${userGross.toLocaleString()} g</span>
				<span class="userCells userSpendings">Spent: ${userSpent.toLocaleString()} g</span>
				${submissionsList}
				<hr/>
				<span class="userGoldTotal">Total: ${userTotal.toLocaleString()} g</span>
				<div class="clear"></div>
			</div>
		</div>
		${userCharacterData}`;

	return div;
}

function appendShopInfo (key) {
	var	jobData = jobDB[key],
		buildingName = jobData.building,
		buildingDesc = jobData.desc,
		buildingImage = jobData.img,
		buildingImageArtist = jobData.artist,
		buildingHours = jobData.hours,
		buildingArea = jobData.area,
		characterData = "",
		characterObj = {},
		job,
		needBottom = ["lbl", "tth", "bmbh", "tmth", "cc"],
		div = document.createElement('div');

	// loop through and get all the characters for display (in job order)
	if (key === "c" || key === "o") {
		// indepedent / civvy
		if (jobData.characters.length > 0) {
			jobData.characters.forEach(function(name) {
				characterObj[name] = characterDB[name];
			});

			characterData = appendCharacterInfo(characterObj, true);
		}
	} else {
		// standard job
		for (var i = 1; i <= 3; i++) {
			job = jobData["job" + i];
			characterObj = {};

			if (job.characters.length > 0) {
				job.characters.forEach(function(name) {
					characterObj[name] = characterDB[name];
				});

				characterData += appendCharacterInfo(characterObj, true);
			}
		}
	}

	div.className = 'cell-outer';
	let templateCode = `
	<div class="userInfoItem shop-description">
		<div class="userContentHeader">
			information
		</div>
		<div class="userContent userStats padding-bottom-short" id="userStats">
			<span class="userCells buildingName">${buildingName}</span>`;

	if (buildingArea) {
		templateCode += `<span class="userCells"><span>${buildingArea}</span></span>`;
	}

	if (buildingHours) {
		templateCode += `<span class="userCells userEnroll"><span>${buildingHours}</span></span>`;
	}

	if (buildingDesc) {
		templateCode += `<span class="buildingDesc">${buildingDesc}</span><div class="clear"></div>`;
	}

	templateCode += `</div></div>`;

	if (buildingImage) {
		templateCode += `<span class="artist-credit"><a href="https://${buildingImageArtist}.deviantart.com/" target="_blank">art by ${buildingImageArtist}</a></span>
		<a id ="shop-image-link" href="${buildingImage}" target="_blank"><div class="shopImage" style="background-image: url('${buildingImage}'); ${key === "fcf" || key === "sos" ? 'background-position:top;': needBottom.indexOf(key) > -1 ? 'background-position:bottom;' : ''}">

		</div></a>`;
	}

	templateCode += `${characterData}`;

	div.innerHTML = templateCode;

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
			collectedMemoriesList += `<a href="${memory[1]}" target="_blank"><img class="image-shadow" src="${userDB["reference"]["memories"][key][1]}"></a>`;
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
		submissionLastDate = new Date(submissionsList[0][4]).toLocaleString(),
		isSpending, gold;

	submissionsList.forEach(function(submission) {
		submissionDate = new Date(submission[4]).toLocaleString();
		isSpending = submission[2] < 0 ? " id='spending'" : "";
		gold = submission[2] < 0 ? submission[2] * -1 : submission[2];
		submissionLink = submission[0] ? `<a href="${submission[3]}" target="_blank">${submission[1]}</a>` : `${submission[1]}`;
		submissionsString += `<li${isSpending}><span${isSpending} class="spring-color">${gold.toLocaleString()} g</span><br>${submissionLink}<br>Recorded: <span class="brown-color">${submissionDate}</span></li>`;
	});

	return `<span class="userCells userSubmissionDate">Last entry: <span>${submissionLastDate}</span></span><div class="submissionsList"><ul>${submissionsString}</ul></div>`;
}

function appendCharacterInfo (characterObj, sortEnroll=false) {
	var template,
		templateArray = [],
		compiledTemplate = "",
		character,
		birthday,
		location,
		hasTracker,
		isHybrid,
		isNPC,
		image;

	Object.keys(characterObj).forEach(function (characterName) {
		character = characterObj[characterName];
		isHybrid = character.isHybrid === "true" ? `<img src="https://orig00.deviantart.net/c4f0/f/2018/017/1/2/isnon_human_by_toffeebot-dc0cefu.png">` : "";
		isNPC = character.isNPC === "true" ? `<img src="https://orig00.deviantart.net/040a/f/2018/017/3/2/issecondary_by_toffeebot-dc0cefl.png">` : "";
		hasTracker = character.tracker !== "" ? `<a href="${character.tracker}" target="_blank"><img class="image-shadow" src="http://orig13.deviantart.net/a57a/f/2017/224/1/2/trackingbtn_by_toffeebot-dbjt7q0.png"></a>` : "";
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
							<a href="${character.app}" target="_blank"><img class="image-shadow" src="http://orig14.deviantart.net/e128/f/2017/224/2/b/appbtn_by_toffeebot-dbjt7q1.png"></a>
							${hasTracker}
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

		templateArray.push({ enroll: character.enroll, template: template });
	});

	if (sortEnroll) {
		templateArray = templateArray.sort(function(a,b) {
			return a.enroll > b.enroll ? 1 : - 1;
		});
	}

	templateArray.forEach(function(pageHtml) {
		compiledTemplate += pageHtml.template;
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
		housemates = getHousemates(location.residents, characterName, residentTitle, location.isCommunal);
		address = getAddress(location.address, location.address[1] === "cc");
		template = (characterName ? `<br><span>Home Address: <span>${address}</span></span>` : "") + housemates;

		if (!characterName) {
			$("div#dialogTitle").text(address);

			if (housemates === "") {
				return (location.isCommunal ? `<span class="add-center">This room is currently unoccupied!</span></span>` : `<span class="add-center">This lot is unoccupied!<br><span>Make it your home today!</span></span>`);
			}
		}

		if (!location.isCommunal) {
			// if they have a house, display the house level
			template = template.concat(`<div class="charaHouseLevel">${parseSize(location.level)} house (level ${location.level})</div>`);

			// may or may not have upgrades
			var upgradesTemplate = parseUpgrades(location);

			if (upgradesTemplate === "") {
				// we are done
				return template;
			}

			template = template.concat(`
				<div class="charaHouseUpgrades">
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

function getHousemates(housematesString, characterName = null, residentTitle = null, isCommunal = false) {
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

	return newHousemateList !== "" ? (characterName ? (isCommunal ? "<br><span>Roommate" : "<br><span>Housemate") : (residentTitle ? `<span>${residentTitle}` : "<span>Resident")) + (housemateCount > 1 ? "s" : "") + `: <span>${newHousemateList}</span></span>` : "";
}

function parseSize(numString) {
	switch(numString) {
		case "1":
			return "small";
		case "2":
			return "medium";
		default:
			return "large";
	}
}

function parseUpgrades (locationObj) {
	var hasPaint = locationObj.hasPaint === "0" ? "" : `<li>Paint Job</li>`,
		hasDesign = locationObj.hasDesign === "0" ? "" : `<li>House Redesign</li>`,
		hasKitchen = locationObj.hasKitchen === "0" ? "" : `<li>Kitchen (${parseSize(locationObj.hasKitchen)})</li>`,
		hasBathroom = locationObj.hasBathroom === "0" ? "" : `<li>Bathroom (${parseSize(locationObj.hasBathroom)})</li>`,
		hasBalcony = locationObj.hasBalcony === "0" ? "" : `<li>Balcony</li>`,
		hasAttic = locationObj.hasAttic === "0" ? "" : `<li>Attic</li>`,
		hasPond = locationObj.hasPond === "0" ? "" : `<li>Pond</li>`,
		hasCoop = locationObj.hasCoop === "0" ? "" : `<li>Small Animal Barn</li>`,
		addRooms = locationObj.addRooms === "0" ? "" : `<li>Number of additional rooms: ${locationObj.addRooms}</li>`;

	return hasPaint.concat(hasDesign, hasKitchen, hasBathroom, hasBalcony, hasAttic, hasPond, hasCoop, addRooms);
}

function submitGold() {
	$("div#submit-gold-error").empty();
	$("div#submit-gold-result").empty();

	var usernames = $("textarea#gold-users").val(),
		gold = parseInt($("input#gold-gold").val().replace(",", "")),
		link = $("input#gold-link").val();

	// handle error
	if (usernames === "") {
		$("div#submit-gold-error").text("Please select at least one user!");
		return;
	}

	if (isNaN(gold)) {
		$("div#submit-gold-error").text("Your gold input is incorrect. Please only use numbers, no text or special characters!");
		return;
	}

	if (gold <= 0) {
		$("div#submit-gold-error").html("You can't earn 0 or less gold!");
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
				userDB[user].submissions.unshift([false,"pending approval",gold,link,new Date().toISOString()]);
				userDB[user].gold += gold;
				userDB[user].total += gold;
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
		link = $("input#memory-link").val(),
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
						".deviantart.com/",
						".deviantart.com/art/",
						"://docs.google.com/document/d/",
						"://drive.google.com/open?id=",
						"://sta.sh/",
						"://sta.sh/comments/",
						"://comments.deviantart.com/",
						"://eclairexpress.wikia.com/wiki/",
						"://eclairexpress.proboards.com/",
						"://media.discordapp.net/attachments/"];

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
}

function openDialog() {
	$("div#dialog").show();
	roundCssTransformMatrix("dialog");
	$("div#overlay-bg").show();
}

function roundCssTransformMatrix(element){
	var el = document.getElementById(element);
	el.style.transform=""; //resets the redifined matrix to allow recalculation, the original style should be defined in the class not inline.
	var mx = window.getComputedStyle(el, null); //gets the current computed style
	mx = mx.getPropertyValue("-webkit-transform") ||
		 mx.getPropertyValue("-moz-transform") ||
		 mx.getPropertyValue("-ms-transform") ||
		 mx.getPropertyValue("-o-transform") ||
		 mx.getPropertyValue("transform") || false;
	var values = mx.replace(/ |\(|\)|matrix/g,"").split(",");
	for(var v in values) {
		values[v]=v > 3 ? Math.ceil(parseInt(values[v])):values[v]; }

	$("#"+element).css({transform:"matrix("+values.join()+")"});
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
					div.html("cc");

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

function createDialog(div, residentTitle = null, isItem = false) {
	div.on( 'click', function( ev ){
		var clickedItem = $(this);

		// reset click event
		$("div#dialog-portrait").prop('onclick',null).off('click');
		$("div#priceInfo").attr('display', 'none');
		$("div#priceInfo").attr('padding-top', '0');
		$("div#priceInfo").height('0px');
		$("div#priceInfo").empty();
		$("div#housingInfo").height('150px');

		if (isItem) {
			getItemDialog(clickedItem);
		} else {
			getHouseDialog(clickedItem, residentTitle);
		}
	});
}
//25px
//5px padding-top
function getItemDialog(itemObj) {
	var itemName = itemObj.attr('data-id'),
		itemKey = itemObj.attr('data-key'),
		template = parseItemData(itemName, itemDB[itemKey][itemName]);

	$("div#housingInfo").empty().append(template);
	openDialog();
}

function parseItemData(itemName, item) {
	$("div#dialogTitle").text(itemName);
	$("div#dialog-portrait").css('background-image', `url('${item.image}')`);
	$("div#dialog-portrait").css("display", "block");

	$("div#priceInfo").attr('display', 'block');
	$("div#priceInfo").height('23px');
	$("div#priceInfo").attr('padding-top', '7px');
	$("div#housingInfo").height('120px');

	$("div#priceInfo").html(`
		<div class="itemCredit"><a href="https://${item.artist}.deviantart.com/" target="_blank">art by ${item.artist}</a></div>
		<div class="itemCost">${item.price} ${item.currency}</div>
	`);
	$("div#dialog-portrait").click(function() {
		window.open(item.image, "blank");
	});

	let template = `
		<div class="item-dialog-outer-container">
			<div class="itemDesc">${item.desc}</div>
		</div>
	`;

	return template;
}

function getHouseDialog(houseObj, residentTitle) {
	var house = houseObj.attr('data-id'),
		template = parseLocation(housingDB[house], undefined, residentTitle);

	if (housingDB[house].img !== "") {
		$("div#dialog-portrait").css('background-image', `url('${housingDB[house].img}')`);
		$("div#dialog-portrait").css("display", "block");
	} else {
		$("div#dialog-portrait").css("display", "none");
	}

	$("div#housingInfo").empty().append(template);
	openDialog();
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
		hasArt = false,
		artBonus = 0,
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

	if ($("#fp-art").val() === "true") {
		hasArt = true;
		artBonus = 200;
	}

	collabBonus = $("#fp-collab").val() === "true" ? 200 : 0;
	rpBonus = $("#fp-rp").val() === "true" ? 200 : 0;
	hqBonus = $("#fp-hq").val() === "true" ? 300 : 0;
	bdayBonus = $("#fp-bday").val() === "true" ? 2 : 1;
	itemBonus = parseInt($("#fp-item").val(), 10);

	if(!hasArt && (hqBonus || bdayBonus === 2 || collabBonus)) {
		$("div#fp-error-message").text("Collabs, heart events, and birthday quests must have an art submission.");
		return;
	}

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
	total = (artBonus + collabBonus + rpBonus) * bdayBonus + hqBonus + itemBonus + eventBonus + etcBonus;

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