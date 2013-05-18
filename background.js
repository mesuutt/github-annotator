// Keep data on localShorage, because
// we make only 60 request per hour.

chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({
        'feedDataLastClearTime': +new Date(),
        'feedData': {}
    });
});

chrome.runtime.onStartup.addListener(function() {
    chrome.storage.sync.get('feedData', function(data) {
        // Clear cache each week
        then = new Date();
        then.setDate (then.getDate() - 7);
        if (then.getTime() > data.feedDataLastClearTime) {
             chrome.storage.sync.clear();
             chrome.storage.sync.set({
                'feedDataLastClearTime': +new Date()
             });
        }
    });
});