function saveOptions() {
    var accessToken = document.querySelector("#access-token").value,
        cacheUser = document.querySelector("#cache-user").checked,
        cacheRepo = document.querySelector("#cache-repo").checked,
        cacheGist = document.querySelector("#cache-gist").checked

    if (accessToken) {
        cacheUser = false;
        cacheRepo = false;
        cacheGist = false;
    }

    chrome.storage.sync.set({
        'cacheUser': cacheUser,
        'cacheRepo': cacheRepo,
        'cacheGist': cacheRepo,
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

    if (!cacheGist) {
        chrome.storage.sync.set({
            'userGist': {}
        });
    }

    message("Settings saved");
}

function clearCache() {
    // Not clear. Update
    chrome.storage.sync.set({
        'userCache': {},
        'repoCache': {},
        'gistCache': {},
        'clearTime': +new Date()
    });

    message("Cache cleared");
}

function restoreOptions() {
     chrome.storage.sync.get(['cacheRepo', 'cacheGist',, 'cacheUser', 'accessToken'], function(data) {

        if (data.accessToken) {
            document.querySelector("#access-token").value = data.accessToken;
            data.cacheRepo = false;
            data.cacheUser = false;
            data.cacheGist = false;
        }

        document.querySelector("#cache-user").checked = data.cacheUser;
        document.querySelector("#cache-repo").checked = data.cacheRepo;
        document.querySelector("#cache-gist").checked = data.cacheGist;
     });
}

function message(msg) {
    document.querySelector("#message").innerHTML = msg;
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('#btn-save').addEventListener('click', saveOptions);
document.querySelector('#btn-clear-cache').addEventListener('click', clearCache);

document.querySelector('#access-token').addEventListener('change', function() {
    document.querySelector('#cache-options').style.display = this.value ? 'none' : 'block';
    document.querySelector('#btn-clear-cache').style.display = this.value ? 'none': 'inline-block';
});
