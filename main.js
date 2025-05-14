// ==UserScript==
// @name         YouTube Beat Seek
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Seek YouTube player by beats using BPM and offset
// @author       You
// @match        https://www.youtube.com/watch?v=*
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    // Create UI elements for BPM and Offset
    const createUI = async () => {
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

        const offsetLabel = document.createElement('label');
        offsetLabel.textContent = 'Offset: ';
        offsetLabel.style.marginRight = '5px';

        const offsetInput = document.createElement('input');
        offsetInput.type = 'number';
        offsetInput.id = 'offsetInput';
        offsetInput.style.width = '50px';

        container.appendChild(bpmLabel);
        container.appendChild(bpmInput);
        container.appendChild(offsetLabel);
        container.appendChild(offsetInput);

        while(true) {
            const titleContainer = document.querySelector('#above-the-fold #title');
            console.log(titleContainer);
            if (titleContainer) {
                titleContainer.parentNode.insertBefore(container, titleContainer);
                break;
            } else {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    };

    // Add keyboard listener for beat seeking
    const addKeyboardListener = () => {
        document.addEventListener('keydown', (event) => {
            const player = document.getElementById('movie_player');
            if (!player) return;

            const bpm = parseFloat(document.getElementById('bpmInput')?.value);
            const offset = parseFloat(document.getElementById('offsetInput')?.value);

            if (isNaN(bpm) || isNaN(offset) || bpm <= 0) return;

            const beatsPerJump = event.ctrlKey ? 1 : 4;
            const beatDuration = 60 / bpm * beatsPerJump; // Duration of the jump in seconds
            const currentTime = player.getCurrentTime();
            const epsilon = 0.01;
            let newTime;

            if (event.key === "]") {
                newTime = Math.ceil((currentTime - offset + epsilon) / beatDuration) * beatDuration + offset;
                player.seekTo(newTime, true);
            } else if (event.key === "[") {
                newTime = Math.floor((currentTime - offset - epsilon) / beatDuration) * beatDuration + offset;
                player.seekTo(newTime, true);
            }
        });
        console.log("Added key listener");
    };

    // Initialize the script
    const init = () => {
        createUI();
        addKeyboardListener();
    };

    // Run the script after the page is fully loaded
    window.addEventListener('load', init);
})();
