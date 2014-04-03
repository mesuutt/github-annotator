chrome.runtime.onInstalled.addListener(clearCache);

chrome.runtime.onStartup.addListener(function() {
    chrome.storage.sync.get('clearTime', function(data) {
        // Clear cache each week
        then = new Date();
        then.setDate (then.getDate() - 7);
        if (then.getTime() > data.clearTime) {
            clearCache();
        }
    });
});

function clearCache() {
    chrome.storage.sync.set({
        'clearTime': +new Date(),
        'userCache': {},
        'repoCache': {},
        'gistCache': {},
        'cacheRepo': true,
        'cacheGist': true,
        'cacheUser': true
    });

    chrome.storage.sync.get('accessToken', function(data) {
        chrome.storage.sync.set({
            'cacheUser': !data.accessToken,
            'cacheRepo': !data.accessToken,
            'cacheGist': !data.accessToken
        });
    });
}
