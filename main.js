// ==UserScript==
// @name         YouTube Beat Seek (Persistent)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Seek YouTube player by beats using BPM and offset; stores settings per video
// @author       You
// @match        https://www.youtube.com/watch?v=*
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const getVideoId = () => {
        const url = new URL(window.location.href);
        return url.searchParams.get('v');
    };

    const storageKey = (videoId) => `beatSeekSettings_${videoId}`;

    const defaultSettings = () => ({bpm: '', offset: ''});

    const loadSettings = (videoId) => {
        const stored = localStorage.getItem(storageKey(videoId));
        if (!stored) return defaultSettings();
        try {
            return JSON.parse(stored);
        } catch {
            return defaultSettings;
        }
    };

    const saveSettings = (videoId, bpm, offset) => {
        const data = {
            bpm: bpm || '',
            offset: offset || ''
        };
        localStorage.setItem(storageKey(videoId), JSON.stringify(data));
    };

    const setMessage = (msg) => {
        const el = document.getElementById('beatSeekMessage');
        if (!el) return;
        el.textContent = msg;
        el.style.backgroundColor = '#ffff99'; // light yellow
        setTimeout(() => {
            el.style.backgroundColor = 'transparent';
        }, 50);
    };

    const createUI = async () => {
        const videoId = getVideoId();
        const settings = loadSettings(videoId);

        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginBottom = '10px';
        container.style.padding = '10px';
        container.style.border = '1px solid #ccc';
        container.style.borderRadius = '5px';

        const bpmLabel = document.createElement('label');
        bpmLabel.textContent = 'BPM: ';
        bpmLabel.style.marginRight = '5px';

        const bpmInput = document.createElement('input');
        bpmInput.type = 'number';
        bpmInput.id = 'bpmInput';
        bpmInput.style.marginRight = '10px';
        bpmInput.style.width = '50px';
        bpmInput.value = settings.bpm;

        const offsetLabel = document.createElement('label');
        offsetLabel.textContent = 'Offset: ';
        offsetLabel.style.marginRight = '5px';

        const offsetInput = document.createElement('input');
        offsetInput.type = 'number';
        offsetInput.id = 'offsetInput';
        offsetInput.style.width = '50px';
        offsetInput.value = settings.offset;

        const offsetFromPosition = document.createElement('button');
        offsetFromPosition.textContent = "< Set current";
        offsetFromPosition.addEventListener("click", () => {
            console.log("this");
            const player = document.getElementById('movie_player');
            if (!player) return;
            const currentTime = player.getCurrentTime();
            offsetInput.value = currentTime.toFixed(3);
            setMessage("Set offset");
        });

        const messageContainer = document.createElement('span');
        messageContainer.id = 'beatSeekMessage';
        messageContainer.style.marginLeft = '10px';
        messageContainer.style.transition = 'background-color 0.1s';

        const save = () => {
            saveSettings(videoId, bpmInput.value, offsetInput.value);
        };

        bpmInput.addEventListener('change', save);
        offsetInput.addEventListener('change', save);

        container.appendChild(bpmLabel);
        container.appendChild(bpmInput);
        container.appendChild(offsetLabel);
        container.appendChild(offsetInput);
        container.appendChild(offsetFromPosition);
        container.appendChild(messageContainer);

        while (true) {
            const titleContainer = document.querySelector('#above-the-fold #title');
            if (titleContainer) {
                titleContainer.parentNode.insertBefore(container, titleContainer);
                break;
            } else {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    };

    let lastPrevious = Number.NEGATIVE_INFINITY;
    let marker = null;

    const addKeyboardListener = () => {
        document.addEventListener('keydown', (event) => {
            const player = document.getElementById('movie_player');
            if (!player) return;

            const bpm = parseFloat(document.getElementById('bpmInput')?.value);
            const offset = parseFloat(document.getElementById('offsetInput')?.value);

            if (isNaN(bpm) || isNaN(offset) || bpm <= 0) return;

            const beatsPerJump = event.ctrlKey ? 1 : 4;
            const beatDuration = 60 / bpm;
            const currentTime = player.getCurrentTime();
            const epsilon = 0.01;

            if (event.key === "[" || event.key === "]") {
                let newBeat;
                if (event.key === "]") {
                    newBeat = Math.ceil((currentTime - offset + epsilon) / beatDuration / beatsPerJump) * beatsPerJump;
                    lastPrevious = Number.NEGATIVE_INFINITY;
                } else if (event.key === "[") {
                    const repeatBonus = (event.timeStamp - lastPrevious) < 700 ? 1 : 0;
                    lastPrevious = event.timeStamp;
                    newBeat = (Math.floor((currentTime - offset - epsilon) / beatDuration / beatsPerJump) - repeatBonus) * beatsPerJump;
                }
                const newTime = newBeat * beatDuration + offset;
                player.seekTo(newTime, true);
                setMessage(`Seek to ${Math.floor(newBeat / 4 + 1e-3)}:${newBeat % 4}`);
            } else if (event.key == "e") {
                marker = currentTime;
                setMessage(`Marker set`);
            } else if (event.key == "q") {
                if (marker !== null) {
                    player.pauseVideo();
                    player.seekTo(marker, true);
                } else {
                    setMessage(`Marker not set!`);
                }
            }
        });
    };

    const init = () => {
        createUI();
        addKeyboardListener();
    };

    window.addEventListener('load', init);
})();
