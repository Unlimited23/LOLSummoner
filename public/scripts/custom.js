const protocol = 'https://'
const domain = '.api.riotgames.com/lol/';
const apiKey = 'RGAPI-8fad9e38-ed05-4c30-9500-4c9a00b43c3d';
var userAjax = {};
var recentAjax = {};
var counter = 0;
var viewType = 0;
var recentMatchField = 0;
var staticVersion = '10.3.1'; // Change to the current one;

$(document).ready(function() {
    var api = new API();

    $('#loader').hide();
    $('#search-recent-match').hide();
    $('#search-matches').hide();
    $('#user-info').hide();

    $('#findUser').on('click', function() {
        $('#loader').show();

        api.getUserByUsername();

        $.when(userAjax).done(function() {
            $('#summoner-matches > #grid').empty();
            $('#search-recent-match').show();
            $('#search-matches').show();
            $('#user-info').show();

            api.getUserProfilePicture();
            api.getChampions();
        });    
    });

    $('#findMatch').on('click', function() {
        $('#loader').show();
        if (recentMatchField != $('#search-recent-match').val()
        ) {
            recentMatchField = $('#search-recent-match').val();
            counter += 1;
            api.getRecentMatchById(recentMatchField - 1);

            $.when(recentAjax).done(function() {
                api.drawGridMatches(recentMatchField);
            });
        } else {
            alert('Please choose another match!');
            $('#loader').hide();
        }
        
    });

    $('#listView').on('click', function() {
        $('[id^="recentMatch"]').removeClass().addClass('list-group my-2').attr({'style' : 'width: 50%'});
        $('[id^="recentMatch"] > div').removeClass('col').addClass('rounded-right');
        $('[id^="recentMatch"] > div > div').removeClass('row');
    });

    $('#gridView').on('click', function() {
        $('[id^="recentMatch"]').removeClass().addClass('d-inline-flex justify-content-center w-100 my-2 mr-sm-2');
        $('[id^="recentMatch"] > div').addClass('col rounded-right');
        $('[id^="recentMatch"] > div > div').addClass('row');
    });
});

function API() {
    var self = this;
    var user = {};
    var userPositions = {};
    var matches = {};
    var recentMatch = {};
    var recentMatches = {};
    var champions = {};

    this.getUserByUsername = function() {
        var apiURL = 'summoner/v4/summoners/by-name/';
        var data = {};
        data['search-username'] = $('#search-username').val();
        var url = self.buildURL(apiURL, data);
    
        userAjax = $.ajax({
            url: url,
            type: 'GET',
            success: function(resp) {
                self.user = resp;
                $('#username').text(self.user.name);
                self.getUserPositions();
                self.getRecentMatches();
            },
            error: function(er) {
                if (er.status == '404') {
                    alert('User not found');
                    //TODO: refresh page
                }
            }
        });
        return true;
    }

    this.getUserPositions = function() {
        var apiURL = 'league/v4/entries/by-summoner/{0}/'
        var url = self.buildURL(self.format(apiURL, [self.user.id]));

        $.get(url, {}, function(resp) {
            if (resp != undefined) { //summoner has played ranked games
                self.userPositions = resp;
                $('#summoner-positions').show();
                $('#division-solo').text(resp[0].tier + ' ' + resp[0].rank);
                //$('#division-flex').text(resp[1].tier + ' ' + resp[1].rank);
                $('#lp-solo').text(resp[0].leaguePoints + 'LP / ' + resp[0].wins + 'W ' + resp[0].losses + 'L');
                //$('#lp-flex').text(resp[1].leaguePoints + 'LP / ' + resp[1].wins + 'W ' + resp[1].losses + 'L');
            } else if (resp.length > 0) { //summoner has not played ranked games
                $('#summoner-positions').show();
            } else {
                $('#summoner-positions').hide();
                $('#search-matches').hide();
            }
        });
    }

    this.getUserProfilePicture = function() {
        var iconUrl = 'http://ddragon.leagueoflegends.com/cdn/{0}/img/profileicon/{1}.png';

        iconUrl = self.format(iconUrl, [staticVersion, self.user.profileIconId]);
        $('#profilePic').attr({'src' : iconUrl});
    }

    this.getChampions = function() {
        var url = 'http://ddragon.leagueoflegends.com/cdn/{0}/data/en_US/champion.json';

        var url = self.format(url, [staticVersion]);

        $.get(url, {}, function(resp) {
            var listChampions = [];

            for (var champ in resp.data) {
                if (resp.data.hasOwnProperty(champ)) {
                    listChampions.push(resp.data[champ]);
                }
            }

            self.champions = listChampions;
            $('#loader').hide();
        });
    }

    this.getChampionNameById = function(id) {
        if (self.champions.hasOwnProperty(id)) {
            return self.champions[id].name;
        }

        return '';
    }

    this.getChampionPicture = function(name) {
        var iconURL = 'http://ddragon.leagueoflegends.com/cdn/{0}/img/champion/{1}.png';
        return self.format(iconURL, [staticVersion, name]);
    }

    this.getRecentMatches = function() {
        var apiURL = 'match/v4/matchlists/by-account/{0}/';
        var url = self.buildURL(self.format(apiURL, [self.user.accountId]));

        $.get(url, {}, function(resp) {
            self.recentMatches = resp;
            self.getRecentMatchById();
        });
    }

    this.getRecentMatchById = function(gameId = 0) {
        var apiURL = 'match/v4/matches/{0}/';

        var url = self.buildURL(self.format(apiURL, [self.recentMatches.matches[gameId].gameId]));
        recentAjax = $.get(url, {}, function(resp) {
            self.recentMatch = resp;
        });
    }

    this.drawGridMatches = function(recentMatchField) {
        var content = '';

        content = '<div id="recentMatch'+ recentMatchField +'" class="d-inline-flex justify-content-center w-100 my-2 mr-sm-2">'
        $.each(self.recentMatch.teams, function(i, match) {
            var bgColor = match.win == 'Win' ? '#a3cfec' : '#e2b6b3'; 
            content += '<div class="col rounded-right" style="background-color: '+ bgColor +'">';

            $.each(self.recentMatch.participants, function(p, summoner) {
                var summonerIdentity = self.recentMatch.participantIdentities[p].player;
                var champName = self.getChampionNameById(summoner.championId);
                var src = self.getChampionPicture(champName);

                if (match.teamId == summoner.teamId) {
                    content += '<div class="row">'
                            +       '<img src="'+ src +'" class="mr-sm-2" alt="" width="40" height="40">'
                            +       '<span>'+ summonerIdentity.summonerName +'</span>'
                            +   '</div>';
                }
            });

            content += '</div>';
        });
        content += '</div>'

        $('#summoner-matches #grid').append(content);
        $('#loader').hide();
    }
    
    this.buildURL = function(url, uriParts = [], noParam = true) {
        var querySeparator = noParam ? '?' : '&';
        var server = $('#servers').val();
        url = protocol + server + domain + url;
        for (var key in uriParts) {
            if (uriParts.hasOwnProperty(key)) {
                var element = uriParts[key];
                url = url.concat(element + '/');
            }
        }
        return url.slice(0, -1).concat(querySeparator + 'api_key=' + apiKey);
    }

    this.format = function(string, params) {
        $.each(params, function (i, n) {
            string = string.replace(new RegExp("\\{" + i + "\\}", "g"), n);
        })
        return string;
    }
}