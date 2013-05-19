;(function($) {
    var API = (function() {
        var apiRoot = "https://api.github.com",
        cache = {},
        noop = function(){},
        activeRequest,
        getReq = function(url, callback, failCallback) {
            if (activeRequest) {
                activeRequest.abort();
            }

            var xhr = $.get(url);

            activeRequest = xhr;
            xhr.done(callback)
                .fail(function() {
                    // If request not aborted
                    if (xhr.getAllResponseHeaders()){
                        (failCallback || noop)(xhr);
                    }
                })
                .always(function() {
                    activeRequest = false;
                });

            return xhr;
        },
        getRepo = function(owner, repo , callback, failCallback) {
            var key = 'repo_' + owner + repo;

            if (cache[key]) {
                return callback(cache[key]);
            }

            return getReq(apiRoot + '/repos/' + owner + '/' + repo, function(res) {
                cacheRepo(key, res);
                callback(res);
            }, failCallback);
        },
        cacheRepo = function(key, res) {
            if ( ! res.description) return;
            // Cache only required values
            cache[key] = {
                description: res.description,
                full_name:  res.full_name
            };

            chrome.storage.sync.set({
                'cache': cache
            });
        },
        getUser = function(username, callback, failCallback) {
            var key = 'user_' + username;

            if (cache[key]) {
                return callback(cache[key]);
            }

            return getReq(apiRoot + '/users/' + username, function(res) {
                cacheUser(key, res);
                callback(res);
            }, failCallback);
        },
        cacheUser = function(key, res) {
            if ( ! res.login) return;
            // Cache only required values
            cache[key] = {
                login: res.login,
                name: res.name,
                avatar_url: res.avatar_url,
                public_repos: res.public_repos,
                followers: res.followers,
                following: res.following
            };

            chrome.storage.sync.set({
                'cache': cache
            });
        },
        loadCache =  function() {
            chrome.storage.sync.get('cache', function (data) {
                cache = data.cache;
            });
        };

        loadCache();

        return {
            getRepo: getRepo,
            getUser: getUser
        };

    })();

    var repoTooltip =  function($el, data) {
        var $tooltip = $el.siblings('#repo-tooltip-' + data.full_name.replace('/', '-'));

        $el.removeAttr("title");
        if (! $tooltip.length) {
            $tooltip = $('<div />', {
                'id' : 'repo-tooltip-' + data.full_name.replace('/', '-'),
                'class' : 'ginfo-tooltip repo-tooltip',
                html : data.description
            });
            $tooltip.append('<i class="arrow-down"></i>')
                .appendTo($el.parent());
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
                '<i class="arrow-down"></i>',
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
                    repoTooltip($self, res);
                }, function(req) {
                    repoTooltip($self, {
                        full_name: 'error-' + hrefSplit[1] + hrefSplit[2],
                        description: "Error : " + JSON.parse(req.responseText)['message']
                    });
                });

            } else {
                // User
                API.getUser(hrefSplit[1], function(res) {
                    userTooltip($self, res);
                }, function(req) {
                    // repoTooltip is creating simple tooltip. So using it
                    repoTooltip($self, {
                        full_name: 'error-' + hrefSplit[1],
                        description: "Error : " + JSON.parse(req.responseText)['message']
                    });
                });
            }

            $self.closest(".alert.simple").css('overflow', 'visible');
        });

        $("#dashboard .news").on("mouseout", ".alert.simple .title a", function(e) {
            $(".ginfo-tooltip").css('display', 'none');
        });
    });
})(jQuery);