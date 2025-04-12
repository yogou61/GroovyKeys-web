// Configuration des niveaux de difficulté
const DIFFICULTY_LEVELS = {
    EASY: {
        name: 'Facile',
        notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'], // Notes blanches uniquement
        timeLimit: 5000, // 5 secondes par note
        pointsPerNote: 2,
        penaltyPoints: -1
    },
    MEDIUM: {
        name: 'Moyen',
        notes: ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4'], // Toutes les notes
        timeLimit: 4000, // 4 secondes par note
        pointsPerNote: 2,
        penaltyPoints: -1
    },
    HARD: {
        name: 'Difficile',
        notes: ['C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
                'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4'], // 2 octaves
        timeLimit: 3000, // 3 secondes par note
        pointsPerNote: 2,
        penaltyPoints: -1
    }
};

class PianoSynth {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.activeOscillators = new Map();
    }

    noteToFrequency(note) {
        const noteMap = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };

        const noteName = note.slice(0, -1);
        const octave = parseInt(note.slice(-1));
        const semitoneOffset = noteMap[noteName];
        
        // A4 = 440Hz
        return 440 * Math.pow(2, (semitoneOffset - 9 + (octave - 4) * 12) / 12);
    }

    playNote(note) {
        const frequency = this.noteToFrequency(note);
        
        // Créer les oscillateurs
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        
        // Créer les gains pour le volume
        const gainNode1 = this.audioContext.createGain();
        const gainNode2 = this.audioContext.createGain();
        const masterGain = this.audioContext.createGain();
        
        // Configuration des oscillateurs
        oscillator1.type = 'sine';
        oscillator2.type = 'triangle';
        oscillator1.frequency.value = frequency;
        oscillator2.frequency.value = frequency;
        
        // Configuration des volumes
        gainNode1.gain.value = 0.5;
        gainNode2.gain.value = 0.2;
        masterGain.gain.value = 0.7;
        
        // Connexion des nœuds audio
        oscillator1.connect(gainNode1);
        oscillator2.connect(gainNode2);
        gainNode1.connect(masterGain);
        gainNode2.connect(masterGain);
        masterGain.connect(this.audioContext.destination);
        
        // Enveloppe ADSR
        const now = this.audioContext.currentTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.7, now + 0.02); // Attack
        masterGain.gain.linearRampToValueAtTime(0.6, now + 0.05); // Decay
        masterGain.gain.linearRampToValueAtTime(0, now + 1.5);    // Release
        
        // Démarrer les oscillateurs
        oscillator1.start();
        oscillator2.start();
        
        // Stocker les oscillateurs actifs
        this.activeOscillators.set(note, {
            oscillators: [oscillator1, oscillator2],
            gainNode: masterGain
        });
        
        // Arrêter les oscillateurs après la durée de la note
        setTimeout(() => {
            oscillator1.stop();
            oscillator2.stop();
            this.activeOscillators.delete(note);
        }, 1500);
    }

    stopNote(note) {
        const sound = this.activeOscillators.get(note);
        if (sound) {
            const now = this.audioContext.currentTime;
            sound.gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
            setTimeout(() => {
                sound.oscillators.forEach(osc => osc.stop());
                this.activeOscillators.delete(note);
            }, 100);
        }
    }
}

class NoteHuntGame {
    constructor() {
        this.currentLevel = null;
        this.score = 0;
        this.currentNote = null;
        this.timer = null;
        this.startTime = null;
        this.gameActive = false;
        this.streak = 0;
        this.notesPlayed = 0;
        this.maxNotes = 10; // Nombre de notes par partie
        this.synth = new PianoSynth();

        // Éléments du DOM
        this.scoreDisplay = document.getElementById('game-score');
        this.noteDisplay = document.getElementById('target-note');
        this.timerDisplay = document.getElementById('time-remaining');
        this.streakDisplay = document.getElementById('current-streak');
        this.keyboard = document.getElementById('piano-keyboard');

        // Liaison des événements
        this.bindEvents();
    }

    bindEvents() {
        // Gestion des touches du piano
        this.keyboard.addEventListener('click', (e) => {
            if (!this.gameActive) return;
            const key = e.target.closest('.piano-key');
            if (key) {
                this.handleNotePlay(key.dataset.note);
            }
        });

        // Gestion du MIDI
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess()
                .then(midiAccess => {
                    for (const input of midiAccess.inputs.values()) {
                        input.onmidimessage = (message) => this.handleMIDIMessage(message);
                    }
                })
                .catch(error => console.warn('MIDI non disponible:', error));
        }
    }

    handleMIDIMessage(message) {
        if (!this.gameActive) return;
        // Note On message (144)
        if (message.data[0] === 144 && message.data[2] > 0) {
            const midiNote = message.data[1];
            const noteName = this.midiNoteToName(midiNote);
            this.handleNotePlay(noteName);
        }
    }

    midiNoteToName(midiNote) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = notes[midiNote % 12];
        return `${noteName}${octave}`;
    }

    startGame(difficulty) {
        this.currentLevel = DIFFICULTY_LEVELS[difficulty];
        this.score = 0;
        this.streak = 0;
        this.notesPlayed = 0;
        this.gameActive = true;
        this.updateDisplay();
        this.generateNewNote();
    }

    generateNewNote() {
        if (this.notesPlayed >= this.maxNotes) {
            this.endGame();
            return;
        }

        const notes = this.currentLevel.notes;
        let newNote;
        do {
            newNote = notes[Math.floor(Math.random() * notes.length)];
        } while (newNote === this.currentNote);

        this.currentNote = newNote;
        this.startTime = Date.now();
        this.updateNoteDisplay();
        this.startTimer();
    }

    handleNotePlay(playedNote) {
        if (!this.gameActive || !this.currentNote) return;

        // Jouer le son de la note
        this.synth.playNote(playedNote);

        if (playedNote === this.currentNote) {
            // Note correcte
            this.score += this.currentLevel.pointsPerNote;
            this.streak++;
            this.notesPlayed++;
            this.updateDisplay();
            this.showFeedback(true);
            clearTimeout(this.timer);
            this.generateNewNote();
        } else {
            // Note incorrecte
            this.score += this.currentLevel.penaltyPoints;
            this.streak = 0;
            this.showFeedback(false);
            this.updateDisplay();
        }
    }

    startTimer() {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            if (this.gameActive) {
                this.streak = 0;
                this.notesPlayed++;
                this.updateDisplay();
                this.showFeedback(false);
                this.generateNewNote();
            }
        }, this.currentLevel.timeLimit);

        // Mise à jour du timer visuel
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        if (!this.gameActive) return;
        
        const timeElapsed = Date.now() - this.startTime;
        const timeRemaining = Math.max(0, this.currentLevel.timeLimit - timeElapsed);
        
        this.timerDisplay.textContent = (timeRemaining / 1000).toFixed(1);

        if (timeRemaining > 0) {
            requestAnimationFrame(() => this.updateTimerDisplay());
        }
    }

    showFeedback(correct) {
        const feedback = document.getElementById('note-feedback');
        feedback.textContent = correct ? '✨ Bravo !' : '❌ Essaie encore !';
        feedback.className = correct ? 'feedback correct' : 'feedback incorrect';
        setTimeout(() => feedback.textContent = '', 1000);
    }

    updateDisplay() {
        this.scoreDisplay.textContent = `Score: ${this.score}`;
        this.streakDisplay.textContent = `Série: ${this.streak}`;
    }

    updateNoteDisplay() {
        this.noteDisplay.textContent = this.currentNote;
        // Mettre en surbrillance la note sur le clavier
        document.querySelectorAll('.piano-key').forEach(key => {
            key.classList.toggle('target', key.dataset.note === this.currentNote);
        });
    }

    endGame() {
        this.gameActive = false;
        clearTimeout(this.timer);
        
        // Afficher le score final et les étoiles
        const stars = this.calculateStars();
        const gameOverMessage = `
            Partie terminée !\n
            Score final : ${this.score}\n
            Étoiles gagnées : ${'⭐'.repeat(stars)}\n
            ${this.getScoreMessage(stars)}
        `;
        
        alert(gameOverMessage);
        
        // Sauvegarder le meilleur score
        this.saveHighScore();
    }

    calculateStars() {
        const maxScore = this.maxNotes * this.currentLevel.pointsPerNote;
        const percentage = (this.score / maxScore) * 100;

        if (percentage >= 80) return 3;
        if (percentage >= 60) return 2;
        if (percentage >= 40) return 1;
        return 0;
    }

    getScoreMessage(stars) {
        switch(stars) {
            case 3: return "Incroyable ! Tu es un véritable maître du piano ! 🎹✨";
            case 2: return "Excellent travail ! Continue comme ça ! 🎵";
            case 1: return "Bon début ! Essaie d'être plus rapide la prochaine fois ! 🎼";
            default: return "Continue de t'entraîner, tu vas y arriver ! 💪";
        }
    }

    saveHighScore() {
        const difficulty = this.currentLevel.name;
        const highScores = JSON.parse(localStorage.getItem('noteHuntHighScores') || '{}');
        
        if (!highScores[difficulty] || this.score > highScores[difficulty]) {
            highScores[difficulty] = this.score;
            localStorage.setItem('noteHuntHighScores', JSON.stringify(highScores));
        }
    }
}

// Fonction pour générer le clavier du piano
function generatePianoKeyboard() {
    const keyboard = document.getElementById('piano-keyboard');
    keyboard.innerHTML = ''; // Nettoyer le clavier existant
    
    const octaves = [3, 4];
    const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackNotes = {
        'C#': 1, 'D#': 2, 'F#': 4, 'G#': 5, 'A#': 6
    };

    const synth = new PianoSynth();

    // Créer un conteneur pour chaque octave
    octaves.forEach(octave => {
        const octaveDiv = document.createElement('div');
        octaveDiv.className = 'octave';
        
        // Créer les touches blanches
        whiteNotes.forEach((note, index) => {
            const whiteKey = document.createElement('div');
            whiteKey.className = 'piano-key white';
            whiteKey.dataset.note = `${note}${octave}`;
            
            // Ajouter les événements pour le son
            whiteKey.addEventListener('mousedown', () => {
                whiteKey.classList.add('pressed');
                synth.playNote(whiteKey.dataset.note);
            });
            
            whiteKey.addEventListener('mouseup', () => {
                whiteKey.classList.remove('pressed');
            });
            
            whiteKey.addEventListener('mouseleave', () => {
                whiteKey.classList.remove('pressed');
            });
            
            octaveDiv.appendChild(whiteKey);

            // Ajouter les touches noires associées
            if (blackNotes[note + '#']) {
                const blackKey = document.createElement('div');
                blackKey.className = 'piano-key black';
                blackKey.dataset.note = `${note}#${octave}`;
                blackKey.style.left = `${blackNotes[note + '#'] * 40 - 12}px`;
                
                // Ajouter les événements pour le son
                blackKey.addEventListener('mousedown', () => {
                    blackKey.classList.add('pressed');
                    synth.playNote(blackKey.dataset.note);
                });
                
                blackKey.addEventListener('mouseup', () => {
                    blackKey.classList.remove('pressed');
                });
                
                blackKey.addEventListener('mouseleave', () => {
                    blackKey.classList.remove('pressed');
                });
                
                octaveDiv.appendChild(blackKey);
            }
        });

        keyboard.appendChild(octaveDiv);
    });

    // Ajouter le support du clavier physique
    const keyboardMap = {
        'a': 'C3', 'w': 'C#3', 's': 'D3', 'e': 'D#3', 'd': 'E3',
        'f': 'F3', 't': 'F#3', 'g': 'G3', 'y': 'G#3', 'h': 'A3',
        'u': 'A#3', 'j': 'B3',
        'k': 'C4', 'o': 'C#4', 'l': 'D4', 'p': 'D#4', ';': 'E4',
        "'": 'F4', ']': 'F#4'
    };

    document.addEventListener('keydown', (e) => {
        if (!e.repeat && keyboardMap[e.key]) {
            const note = keyboardMap[e.key];
            const key = document.querySelector(`.piano-key[data-note="${note}"]`);
            if (key) {
                key.classList.add('pressed');
                synth.playNote(note);
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (keyboardMap[e.key]) {
            const note = keyboardMap[e.key];
            const key = document.querySelector(`.piano-key[data-note="${note}"]`);
            if (key) {
                key.classList.remove('pressed');
            }
        }
    });
}

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', () => {
    generatePianoKeyboard();
    const game = new NoteHuntGame();
    
    // Gestionnaires pour les boutons de difficulté
    document.getElementById('easy-mode').addEventListener('click', () => game.startGame('EASY'));
    document.getElementById('medium-mode').addEventListener('click', () => game.startGame('MEDIUM'));
    document.getElementById('hard-mode').addEventListener('click', () => game.startGame('HARD'));
});
