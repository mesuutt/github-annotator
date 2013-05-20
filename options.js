function saveOptions() {
    chrome.storage.sync.set({
        'cacheRepo': document.querySelector("#cache-repo").checked,
        'cacheUser': document.querySelector("#cache-user").checked
    });

    message("Settings saved");
}

function clearCache() {
    // Not clear. Update
    chrome.storage.sync.set({
        'cache': {},
        'clearTime': +new Date()
    });

    message("Cache cleared");
}
function restoreOptions() {
     chrome.storage.sync.get(['cacheRepo', 'cacheUser'], function(data) {
        document.querySelector("#cache-repo").checked = data.cacheRepo;
        document.querySelector("#cache-user").checked = data.cacheUser;
     });
}

function message(msg) {
    document.querySelector("#message").innerHTML = msg;
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('#btn-save').addEventListener('click', saveOptions);
document.querySelector('#btn-clear-cache').addEventListener('click', clearCache);