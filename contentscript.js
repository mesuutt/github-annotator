;(function($) {
    var API = (function() {
        var apiRoot = "https://api.github.com",
        accessToken,
        cacheRepo,
        cacheUser,
        repoCache = {},
        userCache = {},
        noop = function(){},
        activeRequest,
        getReq = function(url, callback, failCallback) {
            if (activeRequest) {
                activeRequest.abort();
            }

            if (accessToken) {
                url = url + '?access_token=' + accessToken;
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

            if (repoCache[key]) {
                return callback(repoCache[key]);
            }

            return getReq(apiRoot + '/repos/' + owner + '/' + repo, function(res) {
                addRepoToCache(key, res);
                callback(res);
            }, failCallback);
        },
        addRepoToCache = function(key, res) {
            if ( !cacheRepo || !res.full_name) return;

            // Cache only required values
            repoCache[key] = {
                description: res.description,
                full_name:  res.full_name,
                watchers_count: res.watchers_count,
                forks_count: res.forks_count
            };

            chrome.storage.sync.set({
                'repoCache': repoCache
            });
        },
        getUser = function(username, callback, failCallback) {
            var key = 'user_' + username;

            if (userCache[key]) {
                return callback(userCache[key]);
            }

            return getReq(apiRoot + '/users/' + username, function(res) {
                addUserToCache(key, res);
                callback(res);
            }, failCallback);
        },
        addUserToCache = function(key, res) {
            if ( !cacheUser || !res.login) return;

            // Cache only required values
            userCache[key] = {
                login: res.login,
                name: res.name,
                avatar_url: res.avatar_url,
                public_repos: res.public_repos,
                followers: res.followers,
                following: res.following
            };

            chrome.storage.sync.set({
                'userCache': userCache
            });
        },
        loadCache =  function() {
            var dfd = $.Deferred();
            chrome.storage.sync.get(['userCache', 'repoCache'], function (data) {
                userCache = data.userCache;
                repoCache = data.repoCache;
                dfd.resolve();
            });

            return dfd.promise();
        },
        init = function() {
            var dfd = $.Deferred();
            chrome.storage.sync.get(['accessToken', 'cacheRepo', 'cacheUser'], function (data) {
                accessToken = data.accessToken;
                if (accessToken) {
                    dfd.resolve();
                } else {
                    cacheRepo = data.cacheRepo;
                    cacheUser = data.cacheUser;
                    if (cacheRepo || cacheUser) {
                        loadCache().done(dfd.resolve);
                    }
                }
            });

            return dfd.promise();
        };

        return {
            init: init,
            getRepo: getRepo,
            getUser: getUser
        };

    })();

    var App = {
        createRepoTooltip:  function($el, data) {
            var $tooltip = $el.siblings('#repo-tooltip-' + data.full_name.replace('/', '-'));

            $el.removeAttr("title");
            if (! $tooltip.length) {
                var template = [
                    '<i class="arrow-down"></i>',
                    '<div class="tooltip-content">',
                        '<div class="info-con">',
                            data.description ? '<span>'+data.description+'</span>' : '' ,
                            '<div class="starring-con">',
                                [
                                    data.watchers_count ? '<i class="octicon octicon-star"></i>' + data.watchers_count + ' stars' : '',
                                    data.forks_count ? '<i class="octicon octicon-git-branch"></i>' + data.forks_count +' forks' : ''
                                ].filter(function(item){ return item; }).join('  '),
                            '</div>',
                        '</div>',
                    '</div>'
                ];

                $tooltip = $('<div />', {
                    'id' : 'repo-tooltip-' + data.full_name.replace('/', '-'),
                    'class' : 'ginfo-tooltip repo-tooltip',
                    html : template.filter(function(item){ return item;}).join('') // Remove Description's span if empty
                }).appendTo($el.parent());
            }

            $tooltip.css({
                left: $el.position().left,
                top: ($el.position().top - ($tooltip.outerHeight(true) + 5)),
                display: 'inline-table'
            });

            return  $tooltip;
        },
        createUserTooltip:  function($el, data) {
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
                                ].filter(function(item){ return item; }).join(', '),
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
        },
        createErrorTooltip: function($el, req) {
            var error;
            if (req.status == 403) {
                var errorMsg = '<span>Github limits requests to 60 per hour for unauthenticated requests.</span>';
                    errorMsg += '<span>If you want to go beyond the limit (5000 requests/hour) then look at options page under Settings->Extensions </span>';
                error = errorMsg;
                error +=  '<span>Error message : ' + JSON.parse(req.responseText)['message'] + '</span>';
            } else {
                error = JSON.parse(req.responseText)['message'];
            }

            App.createRepoTooltip($el, {
                full_name: 'error-' + $el.attr("href").replace('/', '-') ,
                description: '<div class="error-tooltip">' + error + '</div>'
            });
        },
        init: function() {
            $("#dashboard").css('overflow', 'visible');
            $("#dashboard .news").on("mouseover", ".alert.simple .title a" , function(e) {
                var $self = $(this),
                    hrefSplit =  $self.attr("href").split('/');

                if (hrefSplit[2]) {
                    // Repo
                    API.getRepo(hrefSplit[1], hrefSplit[2], function(res) {
                        App.createRepoTooltip($self, res);
                    }, function(req) {
                        App.createErrorTooltip($self, req);
                    });

                } else {
                    // User
                    API.getUser(hrefSplit[1], function(res) {
                        App.createUserTooltip($self, res);
                    }, function(req) {
                        App.createErrorTooltip($self, req);
                    });
                }

                $self.closest(".alert.simple").css('overflow', 'visible');
            });

            $("#dashboard .news").on("mouseout", ".alert.simple .title a", function(e) {
                $(".ginfo-tooltip").css('display', 'none');
            });
        }
    };

    API.init().done(App.init);

})(jQuery);