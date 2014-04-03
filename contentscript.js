;(function($) {
    var API = (function() {
        var apiRoot = "https://api.github.com",
        noop = function(){},
        userCache = {},
        repoCache = {},
        gistCache = {},
        accessToken,
        cacheUser,
        cacheRepo,
        cacheGist,
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
        getRepo = function(repoUrl , callback, failCallback) {
            var key = 'repo_' + repoUrl;

            if (repoCache[key]) {
                return callback(repoCache[key]);
            }

            return getReq(apiRoot + '/repos/' + repoUrl, function(res) {
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
        getGist = function(endpoint , callback, failCallback) {
            var key = 'gist_' + endpoint;

            if (gistCache[key]) {
                return callback(gistCache[key]);
            }

            return getReq(apiRoot + '/gists/' + endpoint, function(res) {
                addRepoToCache(key, res);
                callback(res);
            }, failCallback);
        },
        addGistToCache = function(key, res) {
            if ( !cacheGist) return;

            // Cache only required values
            gistCache[key] = {
                id: res.id,
                description: res.description
            };

            chrome.storage.sync.set({
                'gistCache': gistCache
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
            chrome.storage.sync.get(['userCache', 'repoCache', 'gistCache'], function (data) {
                userCache = data.userCache;
                repoCache = data.repoCache;
                gistCache = data.gistCache;
                dfd.resolve();
            });

            return dfd.promise();
        },
        init = function() {
            var dfd = $.Deferred();
            chrome.storage.sync.get(['accessToken', 'cacheRepo', 'cacheUser', 'cacheGist'], function (data) {
                accessToken = data.accessToken;
                if (accessToken) {
                    dfd.resolve();
                } else {
                    cacheUser = data.cacheUser;
                    cacheRepo = data.cacheRepo;
                    cacheGist = data.cacheGist;
                    if (cacheUser || cacheRepo || cacheGist) {
                        loadCache().done(dfd.resolve);
                    }
                }
            });

            return dfd.promise();
        };

        return {
            init: init,
            getUser: getUser,
            getRepo: getRepo,
            getGist: getGist,
        };

    })();

    var Extension = {
        escapeHtml: function(str) {
            if (!str) return '';

            return str.replace(/&/g, "&amp;")
                      .replace(/>/g, "&gt;")
                      .replace(/</g, "&lt;");
        },
        createRepoTooltip:  function($el, data, isEscapeHtml) {
            if (!data.description && !data.watchers_count && !data.forks_count) return;

            var $tooltip = $el.siblings('#repo-tooltip-' + data.full_name.replace(/[^\w]+/g, '-'));

            $el.removeAttr("title");
            if (! $tooltip.length) {
                var template = [
                    '<i class="arrow-down"></i>',
                    '<div class="tooltip-content">',
                        '<div class="info-con">',
                            '<span>' + data.description
                                ? (isEscapeHtml ? Extension.escapeHtml(data.description)
                                : data.description)  : '' + '</span>',
                            '<div class="starring-con">',
                                [
                                    data.watchers_count ? '<i class="octicon octicon-star"></i>'
                                        + data.watchers_count + ' stars' : '',
                                    data.forks_count ? '<i class="octicon octicon-git-branch"></i>'
                                        + data.forks_count +' forks' : ''
                                ].filter(function(item){ return item; }).join('  '),
                            '</div>',
                        '</div>',
                    '</div>'
                ];

                $tooltip = $('<div />', {
                    'id' : 'repo-tooltip-' + data.full_name.replace(/[^\w]+/g, '-'),
                    'class' : 'ginfo-tooltip repo-tooltip',
                    'html' : template.filter(function(item){ return item;}).join('') // Remove desc's span if empty
                }).appendTo($el.parent());
            }

            $tooltip.css({
                left: $el.position().left,
                top: ($el.position().top - ($tooltip.outerHeight(true) + 5)),
                display: 'inline-block'
            });

            return  $tooltip;
        },
        createGistTooltip:  function($el, data, isEscapeHtml) {
            var $tooltip = $el.siblings('#gist-tooltip-' + data.id);

            $el.removeAttr("title");
            if (! $tooltip.length) {
                var template = [
                    '<i class="arrow-down"></i>',
                    '<div class="tooltip-content">',
                        '<div class="info-con">',
                            '<span>' + data.description
                                ? (isEscapeHtml ? Extension.escapeHtml(data.description)
                                : data.description)  : '' + '</span>',
                        '</div>',
                    '</div>'
                ];

                $tooltip = $('<div />', {
                    'id' : 'gist-tooltip-' + data.id,
                    'class' : 'ginfo-tooltip repo-tooltip',
                    'html' : template.filter(function(item){ return item;}).join('') // Remove desc's span if empty
                }).appendTo($el.parent());
            }

            $tooltip.css({
                left: $el.position().left,
                top: ($el.position().top - ($tooltip.outerHeight(true) + 5)),
                display: 'inline-block'
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
                        '<img src="' + data.avatar_url + '"/>',
                        '<div class="info-con">',
                            '<span>' + (data.name || '') + '</span>',
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
                display: 'inline-block'
            });

            return  $tooltip;
        },
        createErrorTooltip: function($el, req) {
            var error;

            if (req.status == 403) {
                var errorMsg = '<span>Github limits requests to 60 per hour for unauthenticated requests.</span>';
                    errorMsg += '<span>If you want to go beyond the limit (5000 requests/hour)';
                    errorMsg += ' then look at options page under Settings->Extensions </span>';
                error = errorMsg;
                error +=  '<span>Error message : ' + JSON.parse(req.responseText)['message'] + '</span>';
            } else {
                error = JSON.parse(req.responseText)['message'];
            }

            Extension.createRepoTooltip($el, {
                full_name: 'error-' + $el.text().replace(/[^\w]+/g, '-') ,
                description: '<div class="error-tooltip">' + error + '</div>'
            }, false);
        },
        init: function() {
            var $dashboard =  $("#dashboard"),
            $activityTab = $(".activity-tab"),
            $container = $dashboard.length ? $dashboard : $activityTab,
            hoverListener = function(e) {
                var regexpUser = /(?:^https\:\/\/github\.com\/)([\w\d_.-]+)$/,
                    regexpRepo = /(?:^https\:\/\/github\.com)?\/(([\w\d_.-]+)\/([\w\d_.-]+))$/,
                    regexpGist = /(?:^https\:\/\/gist\.github\.com\/)([\d]+)$/,
                    $self = $(this),
                    href = $self.attr('href'),
                    endpoint

                if (regexpUser.test(href)) {
                    endpoint = href.match(regexpUser)[1];

                    API.getUser(endpoint, function(res) {
                        Extension.createUserTooltip($self, res);
                    }, function(req) {
                        Extension.createErrorTooltip($self, req);
                    });
                } else if (regexpGist.test(href)){
                    endpoint = href.match(regexpGist)[1];

                    API.getGist(endpoint, function(res) {
                        Extension.createGistTooltip($self, res, true);
                    }, function(req) {
                        Extension.createErrorTooltip($self, req);
                    });
                } else if (regexpRepo.test(href)) {
                    endpoint = href.match(regexpRepo)[1];
                    API.getRepo(endpoint, function(res) {
                        Extension.createRepoTooltip($self, res, true);
                    }, function(req) {
                        Extension.createErrorTooltip($self, req);
                    });
                }

                $self.closest(".alert.simple").css('overflow', 'visible');
            };

            $container.css('overflow', 'visible')
                .find(".news").on("mouseover", ".alert.simple .title a:not(.branch-link)" , hoverListener)
                .end().find(".news").on("mouseout", ".alert.simple .title a:not(.branch-link)", function(e) {
                    $container.find(".ginfo-tooltip").css('display', 'none');
            });
        }
    };

    API.init().done(Extension.init);

})(jQuery);
