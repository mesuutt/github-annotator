;(function() {
    var API = (function() {
        var apiRoot = "https://api.github.com",
        cache = {},
        noop = function(){},
        getReq = function(url, cb, failcb) {
            var req = jQuery.get(url)
                .done(cb)
                .fail(function() {
                    (failcb || noop)(req);
                });
        },
        getRepo = function(owner, repo , cb, failcb) {

            var cacheKeyName = 'repo_' + owner + repo;

            if (cache[cacheKeyName]) {
                return cb(cache[cacheKeyName]);
            }

            return getReq(apiRoot + '/repos/' + owner + '/' + repo, function(res) {
                if ( ! res.description) return;

                cache[cacheKeyName] = { description : res.description };
                chrome.storage.sync.set({
                    'feedData': cache
                });

                cb(res);
            }, failcb);
        },
        getUser = function(username, cb, failcb) {
            var cacheKeyName = 'user_' + username;

            if (cache[cacheKeyName]) {
                return cb(cache[cacheKeyName]);
            }

            return getReq(apiRoot + '/users/' + username, function(res) {
                cache[cacheKeyName] = {
                    login: res.login,
                    name : res.name,
                    avatar_url : res.avatar_url,
                    public_repos : res.public_repos,
                    followers : res.followers,
                    following : res.following
                };

                chrome.storage.sync.set({
                    'feedData': cache
                });
                cb(res);
            }, failcb);
        },
        loadCache =  function() {
            chrome.storage.sync.get('feedData', function (data) {
                cache = data.feedData;
            });
        };

        loadCache();
        return {
            getRepo: getRepo,
            getUser: getUser
        };

    })();

    var repoTooltip =  function($el, content) {
        var $tooltip = $el.siblings('.repo-tooltip');
        $el.removeAttr("title");
        if (! $tooltip.length) {
            $tooltip = $('<div />', {
                'class' : 'ginfo-tooltip repo-tooltip',
                html : content
            });

            $el.parent().append($tooltip);
        }

        $tooltip.css({
            left: $el.position().left,
            top: ($el.position().top - ($tooltip.outerHeight(true) + 5)),
            display: 'inline-table'
        });

        return  $tooltip;
    },
    userTooltip =  function($el, data) {
        $el.removeAttr("title");
        var $tooltip = $el.siblings('#user-tooltip-' + data.login);
        if (!$tooltip.length) {

            var template = [
                '<div class="tooltip-content">',
                    '<div><img src="'+data.avatar_url+ '"/></div>',
                    '<div class="info-con">',
                        '<span>'+data.name+'</span>',
                        '<span>',
                            [
                                data.public_repos ? data.public_repos + ' repos' : '',
                                data.followers ? data.followers +' followers' : '',
                                data.following ? data.following + ' following' : ''
                            ].filter(function(item){ return item }).join(', '),
                        '</span>',
                    '</div>',
                '</div>'
            ];

            $tooltip = $('<div />', {
                'id' : 'user-tooltip-' + data.login,
                'class' : 'ginfo-tooltip user-tooltip',
                html : template.join('')
            }).appendTo($el.parent());
        }

        $tooltip.css({
            left: $el.position().left,
            top: ($el.position().top - ($tooltip.outerHeight(true) + 5)),
            display: 'inline-table'
        });

        return  $tooltip;
    };

    $(function(){
        $("#dashboard").css('overflow', 'visible');

        $("#dashboard .news").on("mouseover", ".alert.simple .title a" , function(e) {
             var $self = $(this),
                hrefSplit =  $self.attr("href").split('/');
            if (hrefSplit[2]) {
                // Repo
                API.getRepo(hrefSplit[1], hrefSplit[2], function(res) {
                    repoTooltip($self, res.description);
                }, function(req) {
                    repoTooltip($self, "Error : " + JSON.parse(req.responseText)['message']);
                });

            } else {
                // User
                API.getUser(hrefSplit[1], function(res) {
                    userTooltip($self, res);
                }, function(req) {
                    // repoTooltip is creation simple tooltip.
                    repoTooltip($self, "Error : " + JSON.parse(req.responseText)['message']);
                });
            }

            $self.closest(".alert.simple").css('overflow', 'visible');
        });

         $("#dashboard .news").on("mouseout", ".alert.simple .title a", function(e) {
            $(".ginfo-tooltip").css('display', 'none');
        });
    });
})();