const auth = window.firebaseAuth; // Usar a instância de auth global
    const onAuthStateChanged = window.onFirebaseAuthStateChanged; // Usar a função global
    // const signOut = window.firebaseAuthFunctions.signOut; // Usar a função signOut global (Removido temporariamente)

    // --- Seletores de Elementos ---
    // const welcomeMessage = document.getElementById('welcome-message'); // Removido temporariamente
    // const logoutButton = document.getElementById('logout-button'); // Removido temporariamente
    const padContainer = document.getElementById('pad-container');
    const addPadButton = document.getElementById('add-pad-button');
    const removeModeButton = document.getElementById('remove-mode-button');
    const colorModeButton = document.getElementById('color-mode-button');
    const addTrackButton = document.getElementById('add-track-button');
    const trackList = document.getElementById('track-list');
    const toggleLibraryButton = document.getElementById('toggle-library-button');
    const soundLibrary = document.getElementById('sound-library');
    const librarySounds = document.getElementById('library-sounds');

    // --- Estado da Aplicação ---
    let isRemoveMode = false;
    let isColorMode = false;
    const padAudio = {};

    // --- Biblioteca de Sons ---
    const sounds = [
        { name: 'Kick', url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' },
        { name: 'Snare', url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' },
        { name: 'Hi-Hat', url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' }
    ];

    function populateSoundLibrary() {
        sounds.forEach(sound => {
            const soundEl = document.createElement('div');
            soundEl.classList.add('library-sound');
            soundEl.innerText = sound.name;
            soundEl.draggable = true;
            soundEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify(sound));
            });
            librarySounds.appendChild(soundEl);
        });
    }

    toggleLibraryButton.addEventListener('click', () => {
        soundLibrary.classList.toggle('hidden');
    });

    // --- Inicialização da UI ---
    // welcomeMessage.textContent = `Bem-vindo, ${user.email}!`; // Removido temporariamente
    // logoutButton.addEventListener('click', () => { // Removido temporariamente
    //     signOut(auth).then(() => {
    //         window.location.href = '../login.html';
    //     });
    // }); // Removido temporariamente

    // ===============================================
    // =========== LÓGICA DOS PADS ===================
    // ===============================================

    const playSound = (pad) => {
        if (isRemoveMode || isColorMode) return;
        const audio = padAudio[pad.id];
        if (audio) {
            audio.currentTime = 0;
            audio.play();
            pad.classList.add('active');
            setTimeout(() => pad.classList.remove('active'), 200);
        }
    };

    const createPad = () => {
        const pad = document.createElement('div');
        const padId = `pad-${Date.now()}-${Math.random()}`;
        pad.id = padId;
        pad.classList.add('pad');
        pad.innerText = `Arraste um som`;

        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-pad-button');
        removeButton.innerHTML = '&times;';
        removeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            delete padAudio[padId];
            pad.remove();
            saveState();
        });

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.classList.add('color-input');
        colorInput.value = '#282828';
        colorInput.addEventListener('input', (e) => {
            const newColor = e.target.value;
            pad.style.backgroundColor = newColor;
            pad.style.borderColor = newColor;
            pad.style.setProperty('--glow-color', newColor);
            saveState();
        });
        colorInput.addEventListener('click', (e) => e.stopPropagation());

        pad.appendChild(removeButton);
        pad.appendChild(colorInput);
        pad.addEventListener('click', () => playSound(pad));

        pad.addEventListener('dragover', (event) => {
            event.preventDefault();
            pad.classList.add('dragover');
        });

        pad.addEventListener('dragleave', () => pad.classList.remove('dragover'));

        pad.addEventListener('drop', (event) => {
            event.preventDefault();
            pad.classList.remove('dragover');

            const soundData = event.dataTransfer.getData('text/plain');
            if (soundData) {
                const sound = JSON.parse(soundData);
                padAudio[padId] = new Audio(sound.url);
                pad.dataset.audioSrc = sound.url;
                pad.dataset.fileName = sound.name;
                pad.innerText = sound.name;
                pad.appendChild(removeButton);
                pad.appendChild(colorInput);
                saveState();
                return;
            }

            const files = event.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('audio/')) {
                const file = files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    const soundURL = e.target.result;
                    padAudio[padId] = new Audio(soundURL);
                    pad.dataset.audioSrc = soundURL;
                    pad.dataset.fileName = file.name;
                    pad.innerText = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
                    pad.appendChild(removeButton);
                    pad.appendChild(colorInput);
                    saveState();
                };
                reader.readAsDataURL(file);
            }
        });

        padContainer.appendChild(pad);
    };

    addPadButton.addEventListener('click', createPad);

    removeModeButton.addEventListener('click', () => {
        isRemoveMode = !isRemoveMode;
        isColorMode = false;
        padContainer.classList.toggle('remove-mode', isRemoveMode);
        padContainer.classList.remove('color-mode');
        removeModeButton.classList.toggle('active', isRemoveMode);
        colorModeButton.classList.remove('active');
        removeModeButton.textContent = isRemoveMode ? 'Sair do Modo Remoção' : 'Modo Remoção';
        colorModeButton.textContent = 'Mudar Cores';
    });

    colorModeButton.addEventListener('click', () => {
        isColorMode = !isColorMode;
        isRemoveMode = false;
        padContainer.classList.toggle('color-mode', isColorMode);
        padContainer.classList.remove('remove-mode');
        colorModeButton.classList.toggle('active', isColorMode);
        removeModeButton.classList.remove('active');
        colorModeButton.textContent = isColorMode ? 'Sair do Modo Cor' : 'Mudar Cores';
        removeModeButton.textContent = 'Modo Remoção';
    });

    // --- Layout Personalization ---
    const changeLayoutButton = document.getElementById('change-layout-button');
    const layoutClasses = ['layout-default', 'layout-alt1', 'layout-alt2']; // Define your layout classes
    let currentLayoutIndex = 0;

    const applyLayout = (layoutClass) => {
        document.body.classList.remove(...layoutClasses);
        document.body.classList.add(layoutClass);
        localStorage.setItem('currentLayout', layoutClass);
    };

    changeLayoutButton.addEventListener('click', () => {
        currentLayoutIndex = (currentLayoutIndex + 1) % layoutClasses.length;
        applyLayout(layoutClasses[currentLayoutIndex]);
    });

    // Load saved layout on page load
    const savedLayout = localStorage.getItem('currentLayout');
    if (savedLayout && layoutClasses.includes(savedLayout)) {
        currentLayoutIndex = layoutClasses.indexOf(savedLayout);
        applyLayout(savedLayout);
    } else {
        applyLayout(layoutClasses[currentLayoutIndex]); // Apply default if no saved layout or invalid
    }

    // ===============================================
    // ======== LÓGICA DAS FAIXAS DE ÁUDIO =========
    // ===============================================

    const createTrackElement = (fileName, fileURL) => {
        const trackItem = document.createElement('div');
        trackItem.classList.add('track-item');
        const audio = new Audio(fileURL);

        trackItem.dataset.audioSrc = fileURL;
        trackItem.dataset.fileName = fileName;

        const trackInfo = document.createElement('div');
        trackInfo.classList.add('track-info');
        const trackName = document.createElement('span');
        trackName.classList.add('track-name');
        trackName.textContent = fileName;
        const controls = document.createElement('div');
        controls.classList.add('track-controls');

        const playButton = document.createElement('button');
        playButton.innerHTML = '&#9658;';
        playButton.addEventListener('click', () => {
            if (audio.paused) { audio.play(); playButton.innerHTML = '&#9208;'; }
            else { audio.pause(); playButton.innerHTML = '&#9658;'; }
        });

        const restartButton = document.createElement('button');
        restartButton.innerHTML = '&#8634;';
        restartButton.addEventListener('click', () => { audio.currentTime = 0; });

        const loopButton = document.createElement('button');
        loopButton.innerHTML = '&#128259;';
        loopButton.addEventListener('click', () => { audio.loop = !audio.loop; loopButton.classList.toggle('active'); });

        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.min = 0; volumeSlider.max = 1; volumeSlider.step = 0.01; volumeSlider.value = 1;
        volumeSlider.addEventListener('input', (e) => { audio.volume = e.target.value; });

        const removeTrackButton = document.createElement('button');
        removeTrackButton.innerHTML = '&times;';
        removeTrackButton.addEventListener('click', () => { audio.pause(); trackItem.remove(); saveState(); });

        const progressBarContainer = document.createElement('div');
        progressBarContainer.classList.add('progress-bar-container');
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        progressBarContainer.appendChild(progressBar);

        audio.addEventListener('timeupdate', () => { progressBar.style.width = `${(audio.currentTime / audio.duration) * 100}%`; });
        audio.addEventListener('ended', () => { playButton.innerHTML = '&#9658;'; });

        controls.appendChild(playButton); controls.appendChild(restartButton); controls.appendChild(loopButton);
        controls.appendChild(volumeSlider); controls.appendChild(removeTrackButton);
        trackInfo.appendChild(trackName); trackInfo.appendChild(controls);
        trackItem.appendChild(trackInfo); trackItem.appendChild(progressBarContainer);
        trackList.appendChild(trackItem);
    };

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const fileURL = e.target.result;
                createTrackElement(file.name, fileURL);
                saveState();
            };
            reader.readAsDataURL(file);
        }
        fileInput.value = '';
    });

    addTrackButton.addEventListener('click', () => fileInput.click());

    // --- Docking Logic ---
    const draggables = document.querySelectorAll('.draggable');
    const dropZones = document.querySelectorAll('.drop-zone');

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', () => {
            draggable.classList.add('dragging');
        });

        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
            saveState();
        });
    });

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const dragging = document.querySelector('.dragging');
            const existingElement = zone.querySelector('.draggable');

            if (existingElement) {
                const draggingParent = dragging.parentElement;
                draggingParent.appendChild(existingElement);
            }
            
            zone.appendChild(dragging);
        });
    });

    // --- Resizing Logic ---
    const resizer = document.getElementById('resizer');
    const leftZone = resizer.previousElementSibling;
    const rightZone = resizer.nextElementSibling;

    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            saveState();
        });
    });

    function handleMouseMove(e) {
        if (!isResizing) return;
        const containerRect = resizer.parentElement.getBoundingClientRect();
        const leftWidth = e.clientX - containerRect.left;
        const rightWidth = containerRect.right - e.clientX;

        const totalWidth = containerRect.width;
        const leftPercentage = (leftWidth / totalWidth) * 100;
        const rightPercentage = (rightWidth / totalWidth) * 100;

        leftZone.style.flex = `0 0 ${leftPercentage}%`;
        rightZone.style.flex = `0 0 ${rightPercentage}%`;
    }

    // --- Save and Load State ---
    function saveState() {
        const state = {
            layout: {
                left: leftZone.style.flex,
                right: rightZone.style.flex,
                leftContent: leftZone.querySelector('.draggable').id,
                rightContent: rightZone.querySelector('.draggable').id
            },
            pads: [],
            tracks: []
        };

        document.querySelectorAll('.pad').forEach(pad => {
            state.pads.push({
                id: pad.id,
                audioSrc: pad.dataset.audioSrc,
                fileName: pad.dataset.fileName,
                color: pad.style.backgroundColor
            });
        });

        document.querySelectorAll('.track-item').forEach(track => {
            state.tracks.push({
                fileName: track.dataset.fileName,
                audioSrc: track.dataset.audioSrc
            });
        });

        localStorage.setItem('cospadState', JSON.stringify(state));
    }

    function loadState() {
        const state = JSON.parse(localStorage.getItem('cospadState'));

        if (!state) {
            for (let i = 0; i < 4; i++) createPad();
            return;
        }

        // Load layout
        leftZone.style.flex = state.layout.left;
        rightZone.style.flex = state.layout.right;
        if (leftZone.querySelector('.draggable').id !== state.layout.leftContent) {
            const leftDraggable = document.getElementById(state.layout.leftContent);
            const rightDraggable = document.getElementById(state.layout.rightContent);
            leftZone.appendChild(leftDraggable);
            rightZone.appendChild(rightDraggable);
        }

        // Load pads
        padContainer.innerHTML = '';
        state.pads.forEach(padState => {
            createPad();
            const newPad = document.getElementById(padState.id);
            if (padState.audioSrc) {
                newPad.dataset.audioSrc = padState.audioSrc;
                newPad.dataset.fileName = padState.fileName;
                padAudio[padState.id] = new Audio(padState.audioSrc);
                newPad.innerText = padState.fileName.length > 15 ? padState.fileName.substring(0, 12) + '...' : padState.fileName;
                newPad.appendChild(newPad.querySelector('.remove-pad-button'));
                newPad.appendChild(newPad.querySelector('.color-input'));
            }
            if (padState.color) {
                newPad.style.backgroundColor = padState.color;
                newPad.style.borderColor = padState.color;
                newPad.style.setProperty('--glow-color', padState.color);
            }
        });

        // Load tracks
        trackList.innerHTML = '';
        state.tracks.forEach(trackState => {
            createTrackElement(trackState.fileName, trackState.audioSrc);
        });
    }

    populateSoundLibrary();
    loadState();