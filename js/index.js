// ==========================================================================
// INICIALIZAÇÃO E AUTENTICAÇÃO (FIREBASE)
// ==========================================================================

// Obtém as instâncias de autenticação do Firebase expostas no objeto window pelo index.html
const auth = window.firebaseAuth;
const onAuthStateChanged = window.onFirebaseAuthStateChanged;

// ==========================================================================
// SELETORES DE ELEMENTOS DOM
// ==========================================================================

// Seleciona todos os elementos da interface com os quais o script vai interagir
const padContainer = document.getElementById('pad-container');
const addPadButton = document.getElementById('add-pad-button');
const removeModeButton = document.getElementById('remove-mode-button');
const colorModeButton = document.getElementById('color-mode-button');
const changeLayoutButton = document.getElementById('change-layout-button');
const toggleLibraryButton = document.getElementById('toggle-library-button');
const soundLibrary = document.getElementById('sound-library');
const librarySounds = document.getElementById('library-sounds');
const addTrackButton = document.getElementById('add-track-button');
const trackList = document.getElementById('track-list');

// ==========================================================================
// ESTADO DA APLICAÇÃO
// ==========================================================================

// Variáveis que controlam o estado atual da interface
let isRemoveMode = false; // Controla se o modo de remoção de pads está ativo
let isColorMode = false;  // Controla se o modo de mudança de cor dos pads está ativo
const padAudio = {};      // Objeto para armazenar os objetos de áudio de cada pad (chave: pad.id)

// ==========================================================================
// BIBLIOTECA DE SONS
// ==========================================================================

// Array de sons padrão para popular a biblioteca
const sounds = [
    { name: 'Kick', url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' }, // URL em base64 de um som de bumbo
    { name: 'Snare', url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' }, // URL em base64 de um som de caixa
    { name: 'Hi-Hat', url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' }  // URL em base64 de um som de prato
];

/**
 * Popula a seção da biblioteca de sons com os sons predefinidos.
 */
function populateSoundLibrary() {
    sounds.forEach(sound => {
        const soundEl = document.createElement('div');
        soundEl.classList.add('library-sound');
        soundEl.innerText = sound.name;
        soundEl.draggable = true; // Torna o elemento arrastável
        
        // Adiciona um ouvinte para o início do arrasto, guardando os dados do som
        soundEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify(sound));
        });
        librarySounds.appendChild(soundEl);
    });
}

// Adiciona o evento para mostrar/esconder a biblioteca de sons
toggleLibraryButton.addEventListener('click', () => {
    soundLibrary.classList.toggle('hidden');
});

// ==========================================================================
// LÓGICA DOS PADS DE SOM
// ==========================================================================

/**
 * Toca o som associado a um pad.
 * @param {HTMLElement} pad - O elemento do pad que foi clicado.
 */
const playSound = (pad) => {
    // Não faz nada se algum modo de edição estiver ativo
    if (isRemoveMode || isColorMode) return;

    const audio = padAudio[pad.id];
    if (audio) {
        audio.currentTime = 0; // Reinicia o áudio para permitir toques rápidos
        audio.play();
        pad.classList.add('active'); // Adiciona a classe para o efeito de "brilho"
        setTimeout(() => pad.classList.remove('active'), 200); // Remove o efeito após 200ms
    }
};

/**
 * Cria um novo elemento de pad e o adiciona ao container.
 */
const createPad = () => {
    const pad = document.createElement('div');
    const padId = `pad-${Date.now()}-${Math.random()}`; // ID único para o pad
    pad.id = padId;
    pad.classList.add('pad');
    pad.innerText = `Arraste um som`;

    // --- Botão de Remover Pad ---
    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-pad-button');
    removeButton.innerHTML = '&times;'; // Símbolo "X"
    removeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o evento de clique do pad seja disparado
        delete padAudio[padId]; // Remove o áudio associado
        pad.remove(); // Remove o pad do DOM
        saveState(); // Salva o novo estado da aplicação
    });

    // --- Seletor de Cor ---
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.classList.add('color-input');
    colorInput.value = '#282828'; // Cor inicial
    colorInput.addEventListener('input', (e) => {
        const newColor = e.target.value;
        // Atualiza a cor de fundo e a cor do "brilho" (variável CSS)
        pad.style.backgroundColor = newColor;
        pad.style.borderColor = newColor;
        pad.style.setProperty('--glow-color', newColor);
        saveState();
    });
    colorInput.addEventListener('click', (e) => e.stopPropagation());

    pad.appendChild(removeButton);
    pad.appendChild(colorInput);

    // --- Slider de Volume ---
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = 0;
    volumeSlider.max = 1;
    volumeSlider.step = 0.01;
    volumeSlider.value = 1;
    volumeSlider.classList.add('volume-slider');
    volumeSlider.addEventListener('input', (e) => {
        if (padAudio[padId]) {
            padAudio[padId].volume = e.target.value;
        }
        saveState();
    });
    volumeSlider.addEventListener('click', (e) => e.stopPropagation());

    pad.appendChild(volumeSlider);
    pad.addEventListener('click', () => playSound(pad));

    // --- Lógica de Drag and Drop (Arrastar e Soltar) ---
    pad.addEventListener('dragover', (event) => {
        event.preventDefault(); // Necessário para permitir o 'drop'
        pad.classList.add('dragover'); // Efeito visual ao arrastar sobre
    });

    pad.addEventListener('dragleave', () => pad.classList.remove('dragover'));

    pad.addEventListener('drop', (event) => {
        event.preventDefault();
        pad.classList.remove('dragover');

        // Verifica se o item arrastado veio da biblioteca de sons
        const soundData = event.dataTransfer.getData('text/plain');
        if (soundData) {
            const sound = JSON.parse(soundData);
            padAudio[padId] = new Audio(sound.url);
            pad.dataset.audioSrc = sound.url;
            pad.dataset.fileName = sound.name;
            pad.innerText = sound.name;
            // Re-anexa os botões para que não sejam sobrescritos pelo innerText
            pad.appendChild(removeButton);
            pad.appendChild(colorInput);
            pad.appendChild(volumeSlider);
            saveState();
            return;
        }

        // Verifica se o item arrastado é um arquivo do computador do usuário
        const files = event.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('audio/')) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                const soundURL = e.target.result; // URL em base64 do arquivo
                padAudio[padId] = new Audio(soundURL);
                pad.dataset.audioSrc = soundURL;
                pad.dataset.fileName = file.name;
                // Limita o tamanho do nome do arquivo exibido
                pad.innerText = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
                pad.appendChild(removeButton);
                pad.appendChild(colorInput);
                pad.appendChild(volumeSlider);
                saveState();
            };
            reader.readAsDataURL(file); // Lê o arquivo como uma URL de dados
        }
    });

    padContainer.appendChild(pad);
};

// Adiciona o evento para criar um novo pad
addPadButton.addEventListener('click', createPad);

// --- Gerenciamento dos Modos de Edição (Remoção e Cor) ---
removeModeButton.addEventListener('click', () => {
    isRemoveMode = !isRemoveMode;
    isColorMode = false; // Desativa o outro modo
    padContainer.classList.toggle('remove-mode', isRemoveMode);
    padContainer.classList.remove('color-mode');
    removeModeButton.classList.toggle('active', isRemoveMode);
    colorModeButton.classList.remove('active');
    // Atualiza o texto dos botões para refletir o estado
    removeModeButton.textContent = isRemoveMode ? 'Sair do Modo Remoção' : 'Modo Remoção';
    colorModeButton.textContent = 'Mudar Cores';
});

colorModeButton.addEventListener('click', () => {
    isColorMode = !isColorMode;
    isRemoveMode = false; // Desativa o outro modo
    padContainer.classList.toggle('color-mode', isColorMode);
    padContainer.classList.remove('remove-mode');
    colorModeButton.classList.toggle('active', isColorMode);
    removeModeButton.classList.remove('active');
    colorModeButton.textContent = isColorMode ? 'Sair do Modo Cor' : 'Mudar Cores';
    removeModeButton.textContent = 'Modo Remoção';
});

// ==========================================================================
// PERSONALIZAÇÃO DO LAYOUT
// ==========================================================================

const layoutClasses = ['layout-default', 'layout-alt1', 'layout-alt2'];
let currentLayoutIndex = 0;

/**
 * Aplica uma classe de layout ao body e a salva no localStorage.
 * @param {string} layoutClass - A classe CSS a ser aplicada.
 */
const applyLayout = (layoutClass) => {
    document.body.classList.remove(...layoutClasses);
    document.body.classList.add(layoutClass);
    localStorage.setItem('currentLayout', layoutClass);
};

// Adiciona o evento para alternar entre os layouts
changeLayoutButton.addEventListener('click', () => {
    currentLayoutIndex = (currentLayoutIndex + 1) % layoutClasses.length;
    applyLayout(layoutClasses[currentLayoutIndex]);
});

// Carrega o layout salvo ao iniciar a página
const savedLayout = localStorage.getItem('currentLayout');
if (savedLayout && layoutClasses.includes(savedLayout)) {
    currentLayoutIndex = layoutClasses.indexOf(savedLayout);
    applyLayout(savedLayout);
} else {
    applyLayout(layoutClasses[0]); // Aplica o layout padrão se não houver um salvo
}

// ==========================================================================
// LÓGICA DAS FAIXAS DE ÁUDIO (TRACKS)
// ==========================================================================

/**
 * Cria um elemento de faixa de áudio completo com controles.
 * @param {string} fileName - O nome do arquivo de áudio.
 * @param {string} fileURL - A URL (base64) do arquivo de áudio.
 */
const createTrackElement = (fileName, fileURL) => {
    const trackItem = document.createElement('div');
    trackItem.classList.add('track-item');
    const audio = new Audio(fileURL);

    // Armazena os dados do áudio no próprio elemento
    trackItem.dataset.audioSrc = fileURL;
    trackItem.dataset.fileName = fileName;

    // --- Criação dos Controles da Faixa ---
    const trackInfo = document.createElement('div');
    trackInfo.classList.add('track-info');
    const trackName = document.createElement('span');
    trackName.classList.add('track-name');
    trackName.textContent = fileName;
    const controls = document.createElement('div');
    controls.classList.add('track-controls');

    const playButton = document.createElement('button');
    playButton.innerHTML = '&#9658;'; // Símbolo de play
    playButton.addEventListener('click', () => {
        if (audio.paused) { audio.play(); playButton.innerHTML = '&#9208;'; } // Pausa
        else { audio.pause(); playButton.innerHTML = '&#9658;'; } // Play
    });

    const restartButton = document.createElement('button');
    restartButton.innerHTML = '&#8634;'; // Símbolo de reiniciar
    restartButton.addEventListener('click', () => { audio.currentTime = 0; });

    const loopButton = document.createElement('button');
    loopButton.innerHTML = '&#128259;'; // Símbolo de loop
    loopButton.addEventListener('click', () => { audio.loop = !audio.loop; loopButton.classList.toggle('active'); });

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = 0; volumeSlider.max = 1; volumeSlider.step = 0.01; volumeSlider.value = 1;
    volumeSlider.addEventListener('input', (e) => { audio.volume = e.target.value; });

    const removeTrackButton = document.createElement('button');
    removeTrackButton.innerHTML = '&times;';
    removeTrackButton.addEventListener('click', () => { audio.pause(); trackItem.remove(); saveState(); });

    // --- Barra de Progresso ---
    const progressBarContainer = document.createElement('div');
    progressBarContainer.classList.add('progress-bar-container');
    const progressBar = document.createElement('div');
    progressBar.classList.add('progress-bar');
    progressBarContainer.appendChild(progressBar);

    audio.addEventListener('timeupdate', () => { progressBar.style.width = `${(audio.currentTime / audio.duration) * 100}%`; });
    audio.addEventListener('ended', () => { playButton.innerHTML = '&#9658;'; });

    // Monta o elemento da faixa
    controls.append(playButton, restartButton, loopButton, volumeSlider, removeTrackButton);
    trackInfo.append(trackName, controls);
    trackItem.append(trackInfo, progressBarContainer);
    trackList.appendChild(trackItem);
};

// --- Lógica para Adicionar Faixa a partir de um Arquivo ---
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'audio/*';
fileInput.style.display = 'none'; // O input fica escondido, é ativado pelo botão
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            createTrackElement(file.name, e.target.result);
            saveState();
        };
        reader.readAsDataURL(file);
    }
    fileInput.value = ''; // Reseta o input para permitir selecionar o mesmo arquivo novamente
});

// O botão "Adicionar Faixa" simplesmente clica no input de arquivo escondido
addTrackButton.addEventListener('click', () => fileInput.click());

// ==========================================================================
// LÓGICA DE DRAG AND DROP E REDIMENSIONAMENTO DO LAYOUT
// ==========================================================================

const draggables = document.querySelectorAll('.draggable');
const dropZones = document.querySelectorAll('.drop-zone');

// Adiciona listeners para os elementos arrastáveis (seção de pads e de faixas)
draggables.forEach(draggable => {
    draggable.addEventListener('dragstart', () => {
        draggable.classList.add('dragging'); // Adiciona classe para feedback visual
    });
    draggable.addEventListener('dragend', () => {
        draggable.classList.remove('dragging');
        saveState(); // Salva o estado após a mudança de layout
    });
});

// Adiciona listeners para as zonas de soltar
dropZones.forEach(zone => {
    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const dragging = document.querySelector('.dragging');
        const existingElement = zone.querySelector('.draggable');

        // Troca os elementos de lugar se a zona de soltar já tiver um
        if (existingElement) {
            const draggingParent = dragging.parentElement;
            draggingParent.appendChild(existingElement);
        }
        zone.appendChild(dragging);
    });
});

// --- Lógica do Redimensionador (Resizer) ---
const resizer = document.getElementById('resizer');
const leftZone = resizer.previousElementSibling;
const rightZone = resizer.nextElementSibling;
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    // Adiciona os listeners no documento para capturar o movimento do mouse em qualquer lugar da página
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        saveState(); // Salva o estado após redimensionar
    });
});

function handleMouseMove(e) {
    if (!isResizing) return;
    const containerRect = resizer.parentElement.getBoundingClientRect();
    const leftWidth = e.clientX - containerRect.left;
    // Define a largura das zonas em porcentagem usando flex-basis
    leftZone.style.flex = `0 0 ${leftWidth}px`;
    rightZone.style.flex = `1 1 auto`; // Deixa a outra zona preencher o resto
}

// ==========================================================================
// SALVAR E CARREGAR ESTADO (LOCALSTORAGE)
// ==========================================================================

/**
 * Salva o estado completo da aplicação (layout, pads, faixas) no localStorage.
 */
function saveState() {
    const state = {
        layout: {
            leftFlex: leftZone.style.flex,
            rightFlex: rightZone.style.flex,
            leftContentId: leftZone.querySelector('.draggable').id,
            rightContentId: rightZone.querySelector('.draggable').id
        },
        pads: [],
        tracks: []
    };

    // Salva as informações de cada pad
    document.querySelectorAll('.pad').forEach(pad => {
        state.pads.push({
            id: pad.id,
            audioSrc: pad.dataset.audioSrc,
            fileName: pad.dataset.fileName,
            color: pad.style.backgroundColor,
            volume: padAudio[pad.id] ? padAudio[pad.id].volume : 1
        });
    });

    // Salva as informações de cada faixa
    document.querySelectorAll('.track-item').forEach(track => {
        state.tracks.push({
            fileName: track.dataset.fileName,
            audioSrc: track.dataset.audioSrc
        });
    });

    localStorage.setItem('cospadState', JSON.stringify(state));
}

/**
 * Carrega o estado da aplicação a partir do localStorage.
 */
function loadState() {
    const state = JSON.parse(localStorage.getItem('cospadState'));

    // Se não houver estado salvo, cria 4 pads iniciais
    if (!state) {
        for (let i = 0; i < 4; i++) createPad();
        return;
    }

    // Carrega o layout (posição e tamanho das seções)
    if (state.layout) {
        leftZone.style.flex = state.layout.leftFlex;
        rightZone.style.flex = state.layout.rightFlex;
        const leftDraggable = document.getElementById(state.layout.leftContentId);
        const rightDraggable = document.getElementById(state.layout.rightContentId);
        if (leftDraggable && rightDraggable) {
            leftZone.appendChild(leftDraggable);
            rightZone.appendChild(rightDraggable);
        }
    }

    // Carrega os pads
    padContainer.innerHTML = ''; // Limpa os pads existentes
    if (state.pads) {
        state.pads.forEach(padState => {
            createPad(); // Cria um pad novo
            const newPad = padContainer.lastChild; // Pega o pad recém-criado
            newPad.id = padState.id; // Restaura o ID original

            if (padState.audioSrc) {
                newPad.dataset.audioSrc = padState.audioSrc;
                newPad.dataset.fileName = padState.fileName;
                padAudio[padState.id] = new Audio(padState.audioSrc);
                newPad.innerText = padState.fileName.length > 15 ? padState.fileName.substring(0, 12) + '...' : padState.fileName;
                // Re-anexa os botões
                newPad.appendChild(newPad.querySelector('.remove-pad-button'));
                newPad.appendChild(newPad.querySelector('.color-input'));
            }
            if (padState.color) {
                newPad.style.backgroundColor = padState.color;
                newPad.style.borderColor = padState.color;
                newPad.style.setProperty('--glow-color', padState.color);
                newPad.querySelector('.color-input').value = padState.color;
            }
            if (padState.volume !== undefined) {
                const volumeSlider = newPad.querySelector('.volume-slider');
                if (padAudio[padState.id]) {
                    padAudio[padState.id].volume = padState.volume;
                }
                if (volumeSlider) {
                    volumeSlider.value = padState.volume;
                }
            }
        });
    }

    // Carrega as faixas
    trackList.innerHTML = ''; // Limpa as faixas existentes
    if (state.tracks) {
        state.tracks.forEach(trackState => {
            createTrackElement(trackState.fileName, trackState.audioSrc);
        });
    }
}

// ==========================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================================

// Função principal que é executada quando a página carrega
function initialize() {
    populateSoundLibrary(); // Popula a biblioteca de sons
    loadState(); // Carrega o estado salvo do usuário
}

// Inicia a aplicação
initialize();
