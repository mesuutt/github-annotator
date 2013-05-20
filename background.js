// Keep data on localShorage, because
// we make only 60 request per hour.

chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.clear();
    chrome.storage.sync.set({
        'clearTime': +new Date(),
        'userCache': {},
        'repoCache': {},
        'cacheRepo': true,
        'cacheUser': true
    });
});

chrome.runtime.onStartup.addListener(function() {
    chrome.storage.sync.get('cache', function(data) {
        // Clear cache each week
        then = new Date();
        then.setDate (then.getDate() - 7);
        if (then.getTime() > data.clearTime) {
            chrome.storage.sync.clear();
            chrome.storage.sync.set({
                'clearTime': +new Date()
            });
        }
    });
});