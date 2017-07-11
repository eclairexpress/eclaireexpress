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
      .done((main, seasonal) => calculateGold(main, seasonal))
      .fail(function(xhr){
        $.mobile.changePage('#error',{transition:'slide'})
      });
  });

// Process the gold calculation based on the spreadsheets.
function calculateGold (main, seasonal) {
  console.log(main);
  console.log(seasonal);

  // If something messed up here, stop processing.
  if (!main[0] || !seasonal[0]) {
    return;
  }

  var mainFeed = main[0].feed,
      seasonalFeed = seasonal[0].feed,
      mainRows = mainFeed.entry || [],
      seasonalRows = seasonalFeed.entry || [];

  mainRows.forEach(function(row) {
    var rowUsername = row['gsx$username'].$t,
        rowImg = row['gsx$img'].$t,
        div = document.createElement('div');

    div.className = 'cell-outer';
    div.innerHTML = `<a href="#" id="userCell" data-id="${rowUsername}">
                        <div class="username" role="userName">${rowUsername}</div>
                        <div class="image" role="image"><img src="${rowImg}"></div>
                    </a>`;

    $('a#userCell', div ).on( 'click', function( ev ){
      console.log(ev);
        var user = ev.currentTarget.dataset['id'];
        $.mobile.changePage('#view', {transition:'slide'});
        $('div#userInfo').html(`${user}`);
    });

    $('div#member-container').append(div);
  }, this);
}
