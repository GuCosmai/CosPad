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

    // --- Estado da Aplicação ---
    let isRemoveMode = false;
    let isColorMode = false;
    const padAudio = {};

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
            const files = event.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('audio/')) {
                const file = files[0];
                const soundURL = URL.createObjectURL(file);
                padAudio[padId] = new Audio(soundURL);
                pad.innerText = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
                pad.appendChild(removeButton);
                pad.appendChild(colorInput);
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

    for (let i = 0; i < 4; i++) createPad();

    // ===============================================
    // ======== LÓGICA DAS FAIXAS DE ÁUDIO =========
    // ===============================================

    const createTrackElement = (fileName, fileURL) => {
        const trackItem = document.createElement('div');
        trackItem.classList.add('track-item');
        const audio = new Audio(fileURL);

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
        removeTrackButton.addEventListener('click', () => { audio.pause(); trackItem.remove(); });

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
            const fileURL = URL.createObjectURL(file);
            createTrackElement(file.name, fileURL);
        }
        fileInput.value = '';
    });

    addTrackButton.addEventListener('click', () => fileInput.click());
