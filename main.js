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

    const saveSettings = (videoId, bpm, offset, chart) => {
        const data = {
            bpm: bpm || '',
            offset: offset || '',
            chart: chart || '',
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
        container.style.marginBottom = '10px';
        container.style.padding = '10px';
        container.style.border = '1px solid #ccc';
        container.style.borderRadius = '5px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';

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
            const player = document.getElementById('movie_player');
            if (!player) return;
            const currentTime = player.getCurrentTime();
            offsetInput.value = currentTime.toFixed(3);
            setMessage("Set offset");
        });

        const drawCircle = document.createElement('button');
        drawCircle.marginLeft = "50px";
        drawCircle.textContent = "Draw circle";
        drawCircle.addEventListener("click", tryDrawCircle);

        const circleCoordinatesInput = document.createElement('input');
        circleCoordinatesInput.type = 'text';
        circleCoordinatesInput.id = 'circleCoordinatesInput';
        circleCoordinatesInput.style.width = '100px';
        circleCoordinatesInput.value = "534 545 390";
        circleCoordinatesInput.addEventListener('change', tryDrawCircle);

        const messageContainer = document.createElement('span');
        messageContainer.id = 'beatSeekMessage';
        messageContainer.style.marginLeft = '10px';
        messageContainer.style.transition = 'background-color 0.1s';

        const chartContainer = document.createElement('details');
        chartContainer.style.marginTop = '10px';
        const chartSummary = document.createElement('summary');
        chartSummary.textContent = 'Chart';
        const chartBox = document.createElement('textarea');
        chartBox.id = 'chartBox';
        chartBox.value = settings.chart || '';
        chartBox.style.width = '100%';
        chartBox.style.overflowY = "hidden";
        const updateChart = () => {
            if (parseChart(chartBox.value)) {
                bpmInput.style.backgroundColor = 'gray';
            } else {
                bpmInput.style.backgroundColor = '';
            }
        };
        updateChart();
        chartBox.addEventListener("input", () => {
            chartBox.style.height = "auto";
            chartBox.style.height = chartBox.scrollHeight + "px";
            updateChart();
        });
        chartContainer.appendChild(chartSummary);
        chartContainer.appendChild(chartBox);

        const save = () => {
            saveSettings(videoId, bpmInput.value, offsetInput.value, chartBox.value);
        };

        bpmInput.addEventListener('change', save);
        offsetInput.addEventListener('change', save);
        chartBox.addEventListener('change', save);
        offsetFromPosition.addEventListener("click", save);

        row.appendChild(bpmLabel);
        row.appendChild(bpmInput);
        row.appendChild(offsetLabel);
        row.appendChild(offsetInput);
        row.appendChild(offsetFromPosition);
        row.appendChild(drawCircle);
        row.appendChild(circleCoordinatesInput);
        row.appendChild(messageContainer);
        container.appendChild(row);
        container.appendChild(chartContainer);

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

    const tryDrawCircle = () => {
        const video = document.querySelector('video');
        if (!video) return;
        setMessage("Trying to draw");

        const REF_W = 1920, REF_H = 1080;

        // remove old overlay if exists
        document.getElementById('circle-overlay')?.remove();

        const rect = video.getBoundingClientRect();
        const videoAspect = rect.width / rect.height;
        const refAspect = REF_W / REF_H;

        let drawW, drawH, offsetX, offsetY;

        if (videoAspect > refAspect) {
            // video is wider → height fits, width letterboxed
            drawH = rect.height;
            drawW = rect.height * refAspect;
            offsetX = rect.left + (rect.width - drawW) / 2;
            offsetY = rect.top;
        } else {
            // video is taller → width fits, height letterboxed
            drawW = rect.width;
            drawH = rect.width / refAspect;
            offsetX = rect.left;
            offsetY = rect.top + (rect.height - drawH) / 2;
        }

        const canvas = document.createElement('canvas');
        canvas.id = 'circle-overlay';
        canvas.style.position = 'absolute';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        canvas.width = drawW;
        canvas.height = drawH;
        canvas.style.width = `${drawW}px`;
        canvas.style.height = `${drawH}px`;
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const scaleX = drawW / REF_W;
        const scaleY = drawH / REF_H;
        ctx.scale(scaleX, scaleY);

        let x = null, y = null, r = null;
        try {
            [x, y, r] = document.getElementById("circleCoordinatesInput").value.split(" ");
        } catch (error) {
            setMessage(`Failed to parse coordinates: ${error}`);
        }

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 4;
        // ctx.beginPath();
        // ctx.moveTo(0, 0);
        // ctx.lineTo(REF_W, REF_H);
        // ctx.stroke();
        // ctx.beginPath();
        // ctx.moveTo(0, REF_H);
        // ctx.lineTo(REF_W, 0);
        // ctx.stroke();
        if (x !== null && y !== null && r !== null) {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.stroke();

            setMessage("Circle drawn");
        }
    };

    let lastPrevious = Number.NEGATIVE_INFINITY;
    let marker = null;
    let chart = null;
    const parseChart = (text) => {
        chart = null;

        const result = [];
        let pos = 0; // current character position in the input text
        let time = 0;
        let measure = 0;

        const lines = text.split('\n');
        for (const line of lines) {
          const trimmedLine = line.replace(/#.*$/, ''); // remove comment
          let i = 0;
          while (i < trimmedLine.length) {
            // skip whitespace
            while (i < trimmedLine.length && /\s/.test(trimmedLine[i])) i++;

            const start = pos + i;
            if (i >= trimmedLine.length) break;

            // parse bpm
            const bpmMatch = /^\d+(\.\d+)?/.exec(trimmedLine.slice(i));
            if (!bpmMatch) {
                setMessage(`Malformed input at position ${start}`);
                return false;
            }
            const bpm = parseFloat(bpmMatch[0]);
            i += bpmMatch[0].length;

            // skip whitespace
            while (i < trimmedLine.length && /\s/.test(trimmedLine[i])) i++;

            // expect colon
            if (trimmedLine[i] !== ':') {
                setMessage(`Expected ':' at position ${pos + i}`);
                return false;
            }
            i++;

            // skip whitespace
            while (i < trimmedLine.length && /\s/.test(trimmedLine[i])) i++;

            // parse beat
            const beatMatch = /^\d+/.exec(trimmedLine.slice(i));
            if (!beatMatch) {
                setMessage(`Malformed input at position ${pos + i}`);
                return false;
            }
            const beat = parseFloat(beatMatch[0]);
            i += beatMatch[0].length;

            const end = pos + i;

            for (let j = 0; j < beat; j++) {
                result.push({ time, measure, currentBeat: j, bpm, beat, start, end });
                time += 60 / bpm;
            }
            measure += 1;

            // skip whitespace
            while (i < trimmedLine.length && /\s/.test(trimmedLine[i])) i++;

            // if there's a comma, skip it and continue
            if (i < trimmedLine.length && trimmedLine[i] === ',') {
                i++;
            } else if (i < trimmedLine.length && trimmedLine[i] !== ',') {
                setMessage(`Expected ',' at position ${pos + i}`);
                return false;
            }
          }
          pos += line.length + 1; // +1 for newline
        }
        result.push({ time, measure, currentBeat: 0, bpm: 0, beat: 0, start: pos, end: pos });

        if (result.length > 1) {
            // setMessage("Chart parsed");
            chart = result;
            return true;
        } else {
            // setMessage("Chart empty");
            return false;
        }
    }

    const addKeyboardListener = () => {
        document.addEventListener('keydown', (event) => {
            const player = document.getElementById('movie_player');
            if (!player) return;

            const bpm = parseFloat(document.getElementById('bpmInput')?.value);
            const offset = parseFloat(document.getElementById('offsetInput')?.value);

            if (isNaN(offset)) {
                setMessage("Please set offset");
                return;
            }
            if (chart === null && (isNaN(bpm) || bpm <= 0)) {
                setMessage("Invalid BPM or chart (at least one of them must be set");
                return;
            }

            const currentTime = player.getCurrentTime();
            if (event.key === "[" || event.key === "]") {
                const beatsPerJump = event.ctrlKey ? 1 : 4;
                const beatDuration = 60 / bpm;
                const epsilon = 0.01;

                let newBeat;
                if (chart === null) {
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
                } else {
                    let newBeat;
                    const beatCondition = (beat) => event.ctrlKey || beat.currentBeat === 0;
                    if (event.key === "]") {
                        newBeat = chart.find(beat => beat.time > currentTime - offset + epsilon && beatCondition(beat));
                    } else if (event.key === "[") {
                        newBeat = chart.slice().reverse().find(beat => beat.time < currentTime - offset - epsilon && beatCondition(beat));
                    }
                    if (newBeat !== undefined) {
                        player.seekTo(newBeat.time + offset, true);
                        setMessage(`Seek to ${newBeat.measure}:${newBeat.currentBeat}/${newBeat.beat}`);
                        document.getElementById('chartBox').setSelectionRange(newBeat.start, newBeat.end);
                    }
                }
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
