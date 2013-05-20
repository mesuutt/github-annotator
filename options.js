function saveOptions() {
    var accessToken = document.querySelector("#access-token").value,
        cacheRepo = document.querySelector("#cache-repo").checked,
        cacheUser = document.querySelector("#cache-user").checked;

    if (!accessToken) {
        cacheRepo = false;
        cacheUser = false;
    }

    chrome.storage.sync.set({
        'cacheRepo': cacheRepo,
        'cacheUser': cacheUser,
        'accessToken': accessToken
    });

    if (!cacheRepo) {
        chrome.storage.sync.set({
            'repoCache': {}
        });
    }

    if (!cacheUser) {
        chrome.storage.sync.set({
            'userCache': {}
        });
    }

    message("Settings saved");
}

function clearCache() {
    // Not clear. Update
    chrome.storage.sync.set({
        'userCache': {},
        'repoCache': {},
        'clearTime': +new Date()
    });

    message("Cache cleared");
}
function restoreOptions() {
     chrome.storage.sync.get(['cacheRepo', 'cacheUser', 'accessToken'], function(data) {

        if (data.accessToken) {
            document.querySelector("#access-token").value = data.accessToken;
            data.cacheRepo = false;
            data.cacheUser = false;
        }

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
document.querySelector('#access-token').addEventListener('change', function() {
    if (this.value) {
        document.querySelector('#cache-options').style.display = 'none';
        document.querySelector('#btn-clear-cache').style.display = 'none';
    } else {
        document.querySelector('#cache-options').style.display = 'block';
        document.querySelector('#btn-clear-cache').style.display = 'inline-block';
    }
});