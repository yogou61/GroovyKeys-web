// Variables et fonctions globales pour le support MIDI
const pianoSounds = {};
let midiAccess = null;

// Fonctions utilitaires pour les notes
const noteNameToMidiNote = (noteName) => {
    const notesRef = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
                     "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11};
    const note = noteName.slice(0, -1);
    const octave = parseInt(noteName.slice(-1));
    return (octave + 1) * 12 + notesRef[note];
};

const midiNoteToNoteName = (midiNote) => {
    const notesRef = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteIndex = midiNote % 12;
    return notesRef[noteIndex] + octave;
};

// Fonctions pour l'audio et MIDI
const playSound = (midiNote, velocity = 100) => {
    const noteName = midiNoteToNoteName(midiNote);
    if (pianoSounds[noteName]) {
        try {
            const audio = new Audio(pianoSounds[noteName]);
            // Augmentation du volume en gardant une plage dynamique
            const baseVolume = 0.7; // Volume de base plus élevé
            const velocityFactor = velocity / 127;
            audio.volume = Math.min(baseVolume + (velocityFactor * 0.3), 1.0);
            audio.play().catch(err => {
                if (err.name === 'NotAllowedError') {
                    console.error("Autorisation audio nécessaire. Veuillez interagir avec la page d'abord.");
                } else {
                    console.error(`Erreur lors de la lecture du son ${noteName}:`, err);
                }
            });
        } catch (e) {
            console.error(`Erreur lors de la création de l'audio pour ${noteName}:`, e);
        }
    } else {
        console.warn(`Son non disponible pour la note ${noteName}`);
    }
};

// Fonctions de retour visuel du piano
const highlightKey = (noteName) => {
    const keySelector = `.white-key[data-note="${noteName}"], .black-key[data-note="${noteName}"]`;
    const key = document.querySelector(keySelector);
    if (key) {
        key.classList.add('playing');
    }
};

const removeHighlightKey = (noteName) => {
    const keySelector = `.white-key[data-note="${noteName}"], .black-key[data-note="${noteName}"]`;
    const key = document.querySelector(keySelector);
    if (key) {
        key.classList.remove('playing');
    }
};

// Fonctions de base MIDI
const noteOn = (midiNote, velocity) => {
    const noteName = midiNoteToNoteName(midiNote);
    highlightKey(noteName);
    playSound(midiNote, velocity);
};

const noteOff = (midiNote) => {
    const noteName = midiNoteToNoteName(midiNote);
    removeHighlightKey(noteName);
};

// Gestionnaires d'événements MIDI
const onMIDIMessage = (message) => {
    const data = message.data;
    const command = data[0] >> 4;
    const note = data[1];
    const velocity = data.length > 2 ? data[2] : 0;

    if (command === 9 && velocity > 0) {
        // Note On
        noteOn(note, velocity);
        
        // Vérifier si la note fait partie de l'accord actuel (si dispo)
        if (window.currentChord && window.currentChord.notes.has(midiNoteToNoteName(note))) {
            const keySelector = `.white-key[data-note="${midiNoteToNoteName(note)}"], .black-key[data-note="${midiNoteToNoteName(note)}"]`;
            const key = document.querySelector(keySelector);
            if (key) {
                key.classList.add('played-correct');
                window.activeChordNotes.add(midiNoteToNoteName(note));
                
                // Vérifier si tout l'accord est joué
                if (window.activeChordNotes.size === window.currentChord.notes.size &&
                    [...window.activeChordNotes].every(note => window.currentChord.notes.has(note))) {
                    console.log('Accord complet joué !', Array.from(window.activeChordNotes));
                }
            }
        }
    } else if (command === 8 || (command === 9 && velocity === 0)) {
        // Note Off
        noteOff(note);
        
        // Gérer le relâchement des notes d'accord (si dispo)
        if (window.currentChord && window.currentChord.notes.has(midiNoteToNoteName(note))) {
            const keySelector = `.white-key[data-note="${midiNoteToNoteName(note)}"], .black-key[data-note="${midiNoteToNoteName(note)}"]`;
            const key = document.querySelector(keySelector);
            if (key) {
                key.classList.remove('played-correct');
                window.activeChordNotes.delete(midiNoteToNoteName(note));
            }
        }
    }
};

const onMIDISuccess = (access) => {
    midiAccess = access;
    console.log("MIDI disponible");

    for (const input of midiAccess.inputs.values()) {
        input.onmidimessage = onMIDIMessage;
        console.log("MIDI Input:", input.name);
    }

    midiAccess.onstatechange = (event) => {
        const port = event.port;
        console.log(`MIDI port ${port.name} changé:`, port.state);
        
        // Si un nouveau périphérique est connecté, ajouter un écouteur
        if (port.type === 'input' && port.state === 'connected') {
            port.onmidimessage = onMIDIMessage;
        }
    };
};

const onMIDIFailure = () => {
    console.error("Impossible d'accéder au MIDI");
};

const requestMIDIAccess = () => {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess({ sysex: false })
            .then(onMIDISuccess)
            .catch(onMIDIFailure);
    } else {
        console.error("MIDI n'est pas supporté dans ce navigateur");
    }
};

// Chargement des sons de piano
const loadPianoSounds = () => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octaves = [3, 4, 5];
    octaves.forEach(octave => {
        notes.forEach(note => {
            let fileName = note;
            if (note.includes('#')) {
                const flatNotes = {'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'};
                fileName = flatNotes[note];
            }
            // Utiliser un chemin absolu pour compatibilité avec GitHub Pages
            const repoName = 'GroovyKeys-web'; // Nom exact du dépôt GitHub
            const isGitHubPages = window.location.hostname.includes('github.io');
            const soundPath = isGitHubPages ? 
                `/${repoName}/piano-mp3/${fileName}${octave}.mp3` : 
                `piano-mp3/${fileName}${octave}.mp3`;
            pianoSounds[`${note}${octave}`] = soundPath;
            
            // Précharger l'audio silencieusement pour une meilleure réactivité
            try {
                const audio = new Audio(soundPath);
                audio.volume = 0;
                audio.preload = 'auto';
            } catch (e) {
                console.warn(`Impossible de précharger le son ${note}${octave}:`, e);
            }
        });
    });
    console.log('Sons piano chargés:', Object.keys(pianoSounds).length);
};

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Configuration initiale
    const pianoDiv = document.getElementById('piano');
    const chordButtonsDiv = document.getElementById('chord-buttons');
    const scaleTypeSelect = document.getElementById('scale-type');
    const scaleRootSelect = document.getElementById('scale-root');

    // Définition des gammes et accords
    const scales = {
        major: {
            intervals: [0, 2, 4, 5, 7, 9, 11],
            chords: {
                'C': { type: 'major', intervals: [0, 4, 7], fingers: [1, 3, 5] },
                'D': { type: 'minor', intervals: [0, 3, 7], fingers: [1, 3, 5] },
                'E': { type: 'minor', intervals: [0, 3, 7], fingers: [1, 3, 5] },
                'F': { type: 'major', intervals: [0, 4, 7], fingers: [1, 3, 5] },
                'G': { type: 'major', intervals: [0, 4, 7], fingers: [1, 3, 5] },
                'A': { type: 'minor', intervals: [0, 3, 7], fingers: [1, 3, 5] },
                'B': { type: 'diminished', intervals: [0, 3, 6], fingers: [1, 2, 4] }
            }
        },
        minor: {
            intervals: [0, 2, 3, 5, 7, 8, 10],
            chords: {
                'C': { type: 'minor', intervals: [0, 3, 7], fingers: [1, 3, 5] },
                'D': { type: 'diminished', intervals: [0, 3, 6], fingers: [1, 2, 5] },
                'E': { type: 'major', intervals: [0, 4, 7], fingers: [1, 3, 5] },
                'F': { type: 'minor', intervals: [0, 3, 7], fingers: [1, 3, 5] },
                'G': { type: 'minor', intervals: [0, 3, 7], fingers: [1, 3, 5] },
                'A': { type: 'major', intervals: [0, 4, 7], fingers: [1, 3, 5] },
                'B': { type: 'major', intervals: [0, 4, 7], fingers: [1, 3, 5] }
            }
        },
        blues: {
            intervals: [0, 3, 5, 6, 7, 10],
            chords: {
                'C': { type: 'dominant7', intervals: [0, 4, 7, 10], fingers: [1, 2, 3, 5] },
                'D': { type: 'minor7', intervals: [0, 3, 7, 10], fingers: [1, 2, 3, 5] },
                'E': { type: 'minor7', intervals: [0, 3, 7, 10], fingers: [1, 2, 3, 5] },
                'F': { type: 'dominant7', intervals: [0, 4, 7, 10], fingers: [1, 2, 3, 5] },
                'G': { type: 'dominant7', intervals: [0, 4, 7, 10], fingers: [1, 2, 3, 5] },
                'A': { type: 'minor7', intervals: [0, 3, 7, 10], fingers: [1, 2, 3, 5] },
                'B': { type: 'diminished7', intervals: [0, 3, 6, 9], fingers: [1, 2, 3, 5] }
            }
        },
        lofi: {
            intervals: [0, 2, 3, 5, 7, 8, 10],
            chords: {
                'C': { type: 'major7', intervals: [0, 4, 7, 11], fingers: [1, 2, 3, 5] },
                'D': { type: 'minor7', intervals: [0, 3, 7, 10], fingers: [1, 2, 3, 5] },
                'E': { type: 'minor7', intervals: [0, 3, 7, 10], fingers: [1, 2, 3, 5] },
                'F': { type: 'major7', intervals: [0, 4, 7, 11], fingers: [1, 2, 3, 5] },
                'G': { type: 'dominant9', intervals: [0, 4, 7, 10, 14], fingers: [1, 2, 3, 4, 5] },
                'A': { type: 'minor9', intervals: [0, 3, 7, 10, 14], fingers: [1, 2, 3, 4, 5] },
                'B': { type: 'minor7b5', intervals: [0, 3, 6, 10], fingers: [1, 2, 3, 5] }
            }
        },
        jazz: {
            intervals: [0, 2, 4, 5, 7, 9, 11],  // Gamme majeure avec altérations jazz
            chords: {
                'C': { type: 'major9', intervals: [0, 4, 7, 11, 14], fingers: [1, 2, 3, 4, 5] },
                'D': { type: 'minor9', intervals: [0, 3, 7, 10, 14], fingers: [1, 2, 3, 4, 5] },
                'E': { type: 'minor7', intervals: [0, 3, 7, 10], fingers: [1, 2, 3, 5] },
                'F': { type: 'major7#11', intervals: [0, 4, 7, 11, 18], fingers: [1, 2, 3, 4, 5] },
                'G': { type: 'dominant13', intervals: [0, 4, 7, 10, 14, 21], fingers: [1, 2, 3, 4, 5] },
                'A': { type: 'minor11', intervals: [0, 3, 7, 10, 14, 17], fingers: [1, 2, 3, 4, 5] },
                'B': { type: 'half-diminished', intervals: [0, 3, 6, 10], fingers: [1, 2, 3, 5] }
            }
        }
    };

    // Gestion des accords et des gammes
    window.currentChord = null;
    window.activeChordNotes = new Set();

    const clearHighlights = () => {
        document.querySelectorAll('.chord-highlight').forEach(key => {
            key.classList.remove('chord-highlight', 'played-correct');
        });
        document.querySelectorAll('.finger-number').forEach(num => {
            num.remove();
        });
        window.currentChord = null;
        window.activeChordNotes.clear();
    };

    const showChord = (noteName, chord) => {
        clearHighlights();
        
        // Sauvegarder l'accord actuel
        window.currentChord = {
            root: noteName,
            type: chord.type,
            intervals: chord.intervals,
            notes: new Set()
        };

        // Calculer la note de base en MIDI
        const rootNote = noteNameToMidiNote(noteName + "4");
        
        // Ajouter chaque note de l'accord et jouer le son
        chord.intervals.forEach((interval, index) => {
            const noteMidi = rootNote + interval;
            const noteFullName = midiNoteToNoteName(noteMidi);
            window.currentChord.notes.add(noteFullName);
            
            const keySelector = `.white-key[data-note="${noteFullName}"], .black-key[data-note="${noteFullName}"]`;
            const key = document.querySelector(keySelector);
            if (key) {
                key.classList.add('chord-highlight');
                
                const fingerNumber = document.createElement('div');
                fingerNumber.className = 'finger-number';
                fingerNumber.textContent = chord.fingers[index];
                key.appendChild(fingerNumber);

                // Jouer toutes les notes simultanément
                playSound(noteMidi, 100);
            }
        });
    };

    const updateChordButtons = () => {
        if (!chordButtonsDiv || !scaleTypeSelect || !scaleRootSelect) return;
        
        chordButtonsDiv.innerHTML = '';
        const scaleType = scaleTypeSelect.value;
        const scaleRoot = scaleRootSelect.value;
        const scaleChords = scales[scaleType].chords;
        
        // Tableau des notes pour la transposition
        const allNotes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const rootIndex = allNotes.indexOf(scaleRoot);
        
        // Pour chaque degré de la gamme (I, II, III, etc.)
        Object.entries(scaleChords).forEach(([chordDegree, chord]) => {
            // Transposer le nom de l'accord selon la tonalité sélectionnée
            const degreeIndex = allNotes.indexOf(chordDegree);
            const transposedIndex = (degreeIndex + rootIndex) % 12;
            const transposedChordName = allNotes[transposedIndex];
            
            const button = document.createElement('button');
            button.className = 'chord-button';
            button.textContent = `${transposedChordName} ${chord.type}`;
            button.addEventListener('click', () => {
                // Désactiver le bouton précédemment sélectionné
                document.querySelectorAll('.chord-button.active').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                showChord(transposedChordName, chord);
            });
            chordButtonsDiv.appendChild(button);
        });
    };

    // Événements pour les changements de gamme
    if (scaleTypeSelect && scaleRootSelect) {
        scaleTypeSelect.addEventListener('change', updateChordButtons);
        scaleRootSelect.addEventListener('change', updateChordButtons);
    }

    // Configuration initiale du clavier
    const keyboardLayout = [
        { note: 'C', black: false, width: 32 },
        { note: 'C#', black: true, width: 24 },
        { note: 'D', black: false, width: 32 },
        { note: 'D#', black: true, width: 24 },
        { note: 'E', black: false, width: 32 },
        { note: 'F', black: false, width: 32 },
        { note: 'F#', black: true, width: 24 },
        { note: 'G', black: false, width: 32 },
        { note: 'G#', black: true, width: 24 },
        { note: 'A', black: false, width: 32 },
        { note: 'A#', black: true, width: 24 },
        { note: 'B', black: false, width: 32 }
    ];
    const octaves = [3, 4, 5];

    const createPianoKey = (keyInfo, octave) => {
        const key = document.createElement('div');
        const isBlack = keyInfo.black;
        key.className = isBlack ? 'black-key' : 'white-key';
        key.dataset.note = `${keyInfo.note}${octave}`;

        // Ajout du nom de la note
        const noteName = document.createElement('span');
        noteName.className = 'note-name';
        noteName.textContent = `${keyInfo.note}${octave}`;
        key.appendChild(noteName);

        // Gestion des événements de la souris
        key.addEventListener('mousedown', () => {
            const midiNote = noteNameToMidiNote(key.dataset.note);
            noteOn(midiNote, 100);
        });

        key.addEventListener('mouseup', () => {
            const midiNote = noteNameToMidiNote(key.dataset.note);
            noteOff(midiNote);
        });

        key.addEventListener('mouseleave', () => {
            const midiNote = noteNameToMidiNote(key.dataset.note);
            noteOff(midiNote);
        });

        return key;
    };

    const generateVirtualKeyboard = () => {
        if (!pianoDiv) return;
        
        pianoDiv.innerHTML = '';
        octaves.forEach(octave => {
            const octaveDiv = document.createElement('div');
            octaveDiv.className = 'octave';
            octaveDiv.id = `octave-${octave}`;
            
            keyboardLayout.forEach(keyInfo => {
                const keyElement = createPianoKey(keyInfo, octave);
                octaveDiv.appendChild(keyElement);
            });
            
            pianoDiv.appendChild(octaveDiv);
        });
    };

    // Métronome
    const metronomeToggle = document.getElementById('metronome-toggle');
    const bpmInput = document.getElementById('bpm');
    const bpmValue = document.getElementById('bpm-value');
    const volumeControl = document.getElementById('metronome-volume');
    const volumeValue = document.getElementById('volume-value');
    const beatDots = document.querySelectorAll('.beat-dot');
    let metronomeInterval = null;
    let isPlaying = false;
    let currentBeat = 0;
    let audioContext = null;
    let metronomeVolume = 0.3;

    const initAudioContext = () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    };

    const updateVolume = () => {
        if (!volumeControl || !volumeValue) return;
        metronomeVolume = volumeControl.value / 100;
        volumeValue.textContent = `${volumeControl.value}%`;
    };

    const playTick = (frequency = 1000, duration = 0.025, volumeMultiplier = 1.0) => {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.value = metronomeVolume * volumeMultiplier;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    };

    const updateBeatDisplay = (beat) => {
        if (!beatDots || beatDots.length === 0) return;
        beatDots.forEach(dot => dot.classList.remove('active'));
        beatDots[beat].classList.add('active');
    };

    const playBeat = () => {
        const isFirstBeat = currentBeat === 0;
        playTick(
            isFirstBeat ? 1200 : 800,  // Fréquence
            0.025,                     // Durée
            isFirstBeat ? 1 : 0.7      // Multiplicateur de volume
        );
        updateBeatDisplay(currentBeat);
        currentBeat = (currentBeat + 1) % beatDots.length;
    };

    const toggleMetronome = () => {
        if (!metronomeToggle || !bpmInput) return;
        
        if (isPlaying) {
            clearInterval(metronomeInterval);
            metronomeToggle.textContent = 'Démarrer';
            metronomeToggle.classList.remove('active');
            beatDots.forEach(dot => dot.classList.remove('active'));
            isPlaying = false;
        } else {
            initAudioContext();
            const bpm = parseInt(bpmInput.value);
            const interval = (60 / bpm) * 1000;
            
            currentBeat = 0;
            playBeat();
            
            metronomeInterval = setInterval(playBeat, interval);
            metronomeToggle.textContent = 'Arrêter';
            metronomeToggle.classList.add('active');
            isPlaying = true;
        }
    };

    const updateBPM = () => {
        if (!bpmInput || !bpmValue) return;
        const bpm = parseInt(bpmInput.value);
        bpmValue.textContent = bpm;
        
        if (isPlaying) {
            clearInterval(metronomeInterval);
            const interval = (60 / bpm) * 1000;
            metronomeInterval = setInterval(playBeat, interval);
        }
    };

    // Événements du métronome
    if (metronomeToggle && bpmInput && volumeControl) {
        metronomeToggle.addEventListener('click', toggleMetronome);
        bpmInput.addEventListener('input', updateBPM);
        volumeControl.addEventListener('input', updateVolume);
    }

    // Raccourci clavier pour le métronome (espace)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            toggleMetronome();
        }
    });

    // Initialisation
    loadPianoSounds();
    generateVirtualKeyboard();
    requestMIDIAccess();
    if (scaleTypeSelect && scaleRootSelect && chordButtonsDiv) {
        updateChordButtons();  // Afficher les accords de la gamme majeure par défaut
    }
});

// Exposer les fonctions globalement
window.noteOn = noteOn;
window.noteOff = noteOff;
window.playSound = playSound;
window.highlightKey = highlightKey;
window.removeHighlightKey = removeHighlightKey;
window.midiNoteToNoteName = midiNoteToNoteName;
window.noteNameToMidiNote = noteNameToMidiNote;