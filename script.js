const VERSION = 1;
const CORS_PROXY = 'https://dacp.jshboxspace.workers.dev/?url=';

// Sorry
var startData = {'fetched': false};

function _qs(selector) { return document.querySelector(selector); }
function _qa(selector) { return document.querySelectorAll(selector); }
function _ge(id) { return document.getElementById(id); }

// Edge forEach polyfill
if (!NodeList.prototype.forEach)
    NodeList.prototype.forEach = Array.prototype.forEach;

async function main() {
    //_qs('#version').innerText = VERSION;

    // Check if data can be loaded
    let params = (new URL(document.location)).searchParams;

    let sessionCode = params.get('session');
    if (sessionCode) {

        if (!await _fetchStartData(sessionCode))
            return;

        // Load header
        let header = _ge('status-bar');
        header.innerText = startData.guild.name;

        // Load channels
        let selector = _ge('channel-selector');
        for (let channelId in startData.channels) {
            let option = document.createElement('option');
            option.text = '# ' + startData.channels[channelId].name;
            option.value = channelId;
            selector.add(option);
        }

        // Display the first channel's data
        _qs('#search-container input').value = params.get('highlight') || '';
        showChannelData();
        closeMessage();

    } else {
        showMessage('Invalid session.\nOpen the link provided by the Discord bot.', true);
    }

}

async function _fetchStartData(sessionCode) {
    showMessage('Please wait...\nFetching session data');
    let dataUrl = (
        'https://cdn.discordapp.com/attachments/' +
        sessionCode.replace(':', '/') + '/logs.txt');

    // Download session data
    let parsed, response;
    response = await fetch(CORS_PROXY + dataUrl);
    switch (response.status) {
        case 403:
            showMessage('Invalid session code.', true);
            return false;
        case 200:
            break;
        default:
            showMessage('Failed to download session data. Error:\n' + response.status, true);
            return false;
    }

    // Set start data
    parsed = await response.json();
    try {
        if (parsed) {
            [
                'version', 'guild', 'members', 'channels',
                'generated', 'total', 'details'
            ].forEach(it => startData[it] = parsed[it]);
            startData.fetched = true;
            if (startData.version !== VERSION) {
                showMessage('Outdated version. Reload the page to try again.', true);
                return false;
            }
            return true;
        }
    } catch (e) {
        console.log(e);
        showMessage('Failed to parse session data. Error:\n' + e.name, true);
        return false;
    }
    showMessage('Session data is invalid. Please start a new session via the Discord bot.', true);
    return false;
}

function showMessage(message, warn = false, button = false) {
    let action = button ? 'remove' : 'add';
    _ge('notification-container').classList.remove('transparent');
    _ge('notification-text').innerText = message;
    _ge('notification-warning').classList[warn ? 'remove' : 'add']('hidden');
    _ge('okay-button').classList[action]('hidden');
    _ge('click-area').classList[action]('hidden');
}

function closeMessage() {
    _ge('notification-container').classList.add('transparent');
}

function showChannelData() {
    let selector = _ge('channel-selector');
    let messages = startData.channels[selector.value].messages;
    let messagesContainer = _ge('messages-container');
    let template = _qs('.template');
    let editTemplate = _qs('.template .edit');

    // Remove all messages first
    _qa('.message-container:not(.template)').forEach(it => it.remove());

    messages.forEach(it => {
        let author = startData.members[it.author];
        let clone = template.cloneNode(true);
        let editsContainer = clone.children[0];
        editsContainer.removeChild(editsContainer.children[0]);
        let [editsButton, contentButton, embedsButton, attachmentsButton] = clone.getElementsByClassName('button');
        let firstValid = 0;
        clone.dataset.message = it.id;
        clone.dataset.author = author.id;

        // Edits portion
        for (let editIndex = 0; editIndex < it.history.length - 1; editIndex++) {
            let edit = it.history[editIndex];
            let editClone = editTemplate.cloneNode(true);
            let [editContentButton, editEmbedsButton] = editClone.getElementsByClassName('button');

            // Set data
            editClone.children[0].innerText = editIndex + 1;
            let [name, messageText] = editClone.children[1].children;
            let [editContent, editEmbeds] = messageText.children;
            name.children[0].innerText = new Date(edit.time * 1000);
            editContent.innerText = edit.content;
            editEmbeds.innerText = edit.embeds;
            if (editEmbeds.innerText) {
                editEmbedsButton.classList.remove('unavailable');
                firstValid = 1;
            }
            if (editContent.innerText) {
                editContentButton.classList.remove('unavailable');
                firstValid = 0;
            }

            // Add to edits container
            showMessageData(editContentButton, firstValid);
            editsContainer.appendChild(editClone);
        }

        // Message portion
        let message = clone.children[1];

        // Avatar
        let link = message.children[0].children[0];
        link.href = author.avatar;
        link.children[0].src = author.avatar;

        // Combo container (name + content)
        let lastItem = it.history[it.history.length - 1];
        let [name, textContainer] = message.children[1].children;
        name.children[0].innerText = author.name;
        name.children[1].innerText = '#' + author.discriminator;
        if (!author.bot)
            name.children[2].classList.add('hidden');
        name.children[3].innerText = new Date(lastItem.time * 1000);
        if (it.deleted > 0) {
            let deleted = name.children[4];
            deleted.innerText = 'Deleted ' + (new Date(it.deleted * 1000));
            deleted.classList.remove('hidden');
        }
        let [content, embeds, attachments] = textContainer.children;
        content.innerText = lastItem.content;
        embeds.innerText = lastItem.embeds;
        for (let urlIndex = 0; urlIndex < it.attachments.length; urlIndex++) {
            let link = document.createElement('a');
            link.href = it.attachments[urlIndex];
            link.target = '_blank';
            link.innerText = 'Attachment ' + (urlIndex + 1);
            attachments.appendChild(link);
            attachments.appendChild(document.createElement('br'));
        }
        if (attachments.children.length) {
            attachmentsButton.classList.remove('unavailable');
            firstValid = 2;
        }
        if (embeds.innerText) {
            embedsButton.classList.remove('unavailable');
            firstValid = 1;
        }
        if (content.innerText) {
            contentButton.classList.remove('unavailable');
            firstValid = 0;
        }
        showMessageData(contentButton, firstValid);

        // Snowflakes
        let snowflakes = message.children[2];
        snowflakes.children[0].children[0].innerText = author.id;
        snowflakes.children[1].children[0].innerText = it.id;
        let editLength = it.history.length - 1;
        editsButton.innerText = 'Show ' + editLength + ' edit' + (editLength == 1 ? '' : 's');
        if (editLength > 0)
            editsButton.classList.remove('unavailable');

        // Append clone to container
        clone.classList.remove('template', 'hidden');
        messagesContainer.appendChild(clone);
    });

    // Fix edit container heights
    _qa('.edits-container').forEach(it => it.style.maxHeight = '0px');

    // Scroll to bottom and highlight
    let topContainer = messagesContainer.parentElement;
    topContainer.scrollTo(0, topContainer.scrollHeight);
    highlightMessages();
}

function showMessageData(element, index) {
    let topContainer = element.parentElement.parentElement.parentElement;
    let divs = topContainer.getElementsByClassName('message-text')[0].children;
    for (let it = 0; it < divs.length; it++)
        divs[it].classList[it == index ? 'add' : 'remove']('focused');
}

function recalculateHeight(element) {
    let editsContainer = element.parentElement.parentElement.parentElement.parentElement;
    if (editsContainer.style.maxHeight !== '0px')
        editsContainer.style.maxHeight = editsContainer.scrollHeight + 'px';
}

function toggleEdits(element) {
    let topContainer = element.parentElement.parentElement.parentElement;
    let editsContainer = topContainer.children[0];
    console.log('current height: ' + editsContainer.style.maxHeight);
    console.log('scrollHeight: ' + editsContainer.scrollHeight);
    if (editsContainer.style.maxHeight !== '0px') { // Hide edits
        editsContainer.style.maxHeight = '0';
        element.innerText = 'Show' + element.innerText.substring(4);
    } else { // Show edits
        editsContainer.style.maxHeight = editsContainer.scrollHeight + 'px';
        element.innerText = 'Hide' + element.innerText.substring(4);
    }
}

function highlightMessages() {
    let search = _ge('search-container').children[0].value.trim();
    let messages = _qa('.message-container:not(.template)');
    if (search.length < 3)
        messages.forEach(it => it.classList.remove('highlighted'));
    else
        messages.forEach(it => it.classList[it.dataset.author.includes(search) ? 'add' : 'remove']('highlighted'));
}

function showGuildInfo() {
    let blurb = (
        'Guild:\n' + startData.guild.name + ' (' + startData.guild.id + ')\n\n' +
        'Log generated:\n' + (new Date(startData.generated * 1000)) + '\n\n' +
        'Total messages:\n' + startData.total + '\n\n' +
        'Details:\n' + startData.details);
    showMessage(blurb, false, true);
}
