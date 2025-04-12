        document.addEventListener('DOMContentLoaded', () => {
    // Configuration initiale
    const pianoDiv = document.getElementById('piano');
    const chordSequenceDiv = document.getElementById('chord-sequence');
    const currentChordDiv = document.getElementById('current-chord');
    const generateButton = document.getElementById('generate-progression');
    const scaleTypeSelect = document.getElementById('practice-scale-type');
    const scaleRootSelect = document.getElementById('practice-scale-root');
    const lengthInput = document.getElementById('progression-length');
    const tempoRangeSelect = document.getElementById('tempo-range');
    const accuracyDiv = document.getElementById('accuracy');
    const streakDiv = document.getElementById('streak');
    const speedScoreDiv = document.getElementById('speed-score');
    const resetButton = document.getElementById('reset-stats');
    const bpmValue = document.getElementById('bpm-value');
    const beatDots = document.querySelectorAll('.beat-dot');

    // Contexte audio pour le métronome
    let audioContext;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.error('Web Audio API non supportée:', e);
    }

    let currentProgression = [];
    let currentChordIndex = 0;
    let chordsCompleted = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let speedScore = 0;
    let activeNotes = new Set();
    let pianoSounds = {};
    let metronomeInterval = null;
    let currentBeat = 0;
    let currentBPM = 90;
    let lastChordTime = 0;

    // Variables pour le timing
    let isFirstChord = true;
    let nextBeatTime = 0;
    let beatCount = 0;

    // Variables pour le suivi des erreurs
    let timingErrors = {
        early: 0,
        late: 0,
        totalDeviation: 0,
        maxDeviation: 0,
        deviations: []
    };

    // Fonction pour générer un BPM aléatoire selon la plage choisie
    const generateRandomBPM = (range) => {
        const ranges = {
            'slow': [60, 80],
            'medium': [80, 100],
            'fast': [100, 120],
            'pro': [120, 140]
        };
        const [min, max] = ranges[range];
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    // Fonction pour calculer le score de vitesse
    const calculateSpeedScore = (chordTime) => {
        if (isFirstChord) {
            // Pour le premier accord, on synchronise avec le prochain temps
            const currentBeat = audioContext.currentTime;
            const beatInterval = 60 / currentBPM;
            nextBeatTime = currentBeat + beatInterval;
            isFirstChord = false;
            return 100; // Premier accord toujours correct
        }

        // Calculer l'écart avec le temps le plus proche
        const beatInterval = 60 / currentBPM;
        const expectedTime = nextBeatTime;
        const timeDiff = Math.abs(chordTime - expectedTime);
        
        // Calculer le score basé sur la précision (tolérance de 20% du beat)
        const tolerance = beatInterval * 0.2;
        const accuracy = Math.max(0, 1 - (timeDiff / tolerance));
        const score = Math.floor(accuracy * 100);

        // Mettre à jour le prochain temps attendu
        nextBeatTime = expectedTime + beatInterval;
        
        return score;
    };

    // Démarrer/Arrêter le métronome
    const toggleMetronome = (start = true) => {
        if (metronomeInterval) {
            clearInterval(metronomeInterval);
            metronomeInterval = null;
            beatDots.forEach(dot => dot.classList.remove('active'));
            beatCount = 0;
        }
        
        if (start) {
            const interval = (60 / currentBPM) * 1000;
            currentBeat = 0;
            isFirstChord = true;
            updateBeatDisplay();
            
            // Synchroniser avec l'AudioContext
            const startTime = audioContext.currentTime;
            nextBeatTime = startTime;
            
            metronomeInterval = setInterval(() => {
                currentBeat = (currentBeat + 1) % beatDots.length;
                beatCount++;
                updateBeatDisplay();
                playMetronomeSound(currentBeat === 0);
                nextBeatTime = startTime + (beatCount * 60 / currentBPM);
            }, interval);
        }
    };

    // Mise à jour de l'affichage du métronome
    const updateBeatDisplay = () => {
        beatDots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentBeat);
        });
    };

    // Son du métronome
    const playMetronomeSound = (isFirstBeat) => {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(isFirstBeat ? 1000 : 800, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.05);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
    };

    // Création du piano virtuel
    const createPiano = () => {
        const keyboardLayout = [
            { note: 'C', black: false },
            { note: 'C#', black: true },
            { note: 'D', black: false },
            { note: 'D#', black: true },
            { note: 'E', black: false },
            { note: 'F', black: false },
            { note: 'F#', black: true },
            { note: 'G', black: false },
            { note: 'G#', black: true },
            { note: 'A', black: false },
            { note: 'A#', black: true },
            { note: 'B', black: false }
        ];

        const octaves = [3, 4, 5];
        const piano = document.createElement('div');
        piano.id = 'piano';

        octaves.forEach(octave => {
            const octaveDiv = document.createElement('div');
            octaveDiv.className = 'octave';

            keyboardLayout.forEach(key => {
                const keyElement = document.createElement('div');
                const noteName = `${key.note}${octave}`;
                keyElement.className = key.black ? 'black-key' : 'white-key';
                keyElement.dataset.note = noteName;

                // Ajout du nom de la note
                const noteNameDiv = document.createElement('div');
                noteNameDiv.className = 'note-name';
                noteNameDiv.textContent = key.note;
                keyElement.appendChild(noteNameDiv);

                keyElement.addEventListener('mousedown', () => {
                    const midiNote = noteNameToMidiNote(noteName);
                    noteOn(midiNote, 100);
                });

                keyElement.addEventListener('mouseup', () => {
                    const midiNote = noteNameToMidiNote(noteName);
                    noteOff(midiNote);
                });

                keyElement.addEventListener('mouseleave', () => {
                    const midiNote = noteNameToMidiNote(noteName);
                    noteOff(midiNote);
                });

                octaveDiv.appendChild(keyElement);
            });

            piano.appendChild(octaveDiv);
        });

        pianoDiv.innerHTML = '';
        pianoDiv.appendChild(piano);
    };

    // Chargement des sons
    const loadSounds = async () => {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octaves = [3, 4, 5];
        const flatNotes = {
            'C#': 'Db',
            'D#': 'Eb',
            'F#': 'Gb',
            'G#': 'Ab',
            'A#': 'Bb'
        };
        
        for (const octave of octaves) {
            for (const note of notes) {
                let fileName = note;
                if (note.includes('#')) {
                    fileName = flatNotes[note];
                }
                const soundPath = `piano-mp3/${fileName}${octave}.mp3`;
                const audio = new Audio(soundPath);
                await audio.load();
                pianoSounds[note + octave] = audio;
            }
        }
    };

    // Configuration MIDI
    const setupMIDI = async () => {
        try {
            const midiAccess = await navigator.requestMIDIAccess();
            midiAccess.inputs.forEach(input => {
                input.onmidimessage = onMIDIMessage;
            });
        } catch (err) {
            console.error('MIDI non disponible:', err);
        }
    };

    // Jouer un son
    const playSound = (midiNote, velocity = 100) => {
        const noteName = midiNoteToNoteName(midiNote);
        const sound = pianoSounds[noteName];
        if (sound) {
            const clone = sound.cloneNode();
            // Amélioration de la dynamique sonore
            const baseVolume = 0.7; // Volume de base plus élevé
            const velocityFactor = velocity / 127;
            clone.volume = Math.min(baseVolume + (velocityFactor * 0.3), 1.0);
            clone.currentTime = 0;
            clone.play().catch(e => console.error('Erreur de lecture:', e));
        }
    };

    // Définition des accords
    const chordDefinitions = {
        'C': { notes: [60, 64, 67], fingers: [1, 3, 5] },        // C E G
        'Cm': { notes: [60, 63, 67], fingers: [1, 2, 5] },       // C Eb G
        'C7': { notes: [60, 64, 67, 70], fingers: [1, 2, 3, 5] },   // C E G Bb
        'CM7': { notes: [60, 64, 67, 71], fingers: [1, 2, 3, 5] },  // C E G B
        'Cm7': { notes: [60, 63, 67, 70], fingers: [1, 2, 3, 5] },  // C Eb G Bb
        'Cdim': { notes: [60, 63, 66], fingers: [1, 2, 4] },     // C Eb Gb

        'D': { notes: [62, 66, 69], fingers: [1, 3, 5] },        // D F# A
        'Dm': { notes: [62, 65, 69], fingers: [1, 2, 5] },       // D F A
        'D7': { notes: [62, 66, 69, 72], fingers: [1, 2, 3, 5] },   // D F# A C
        'DM7': { notes: [62, 66, 69, 73], fingers: [1, 2, 3, 5] },  // D F# A C#
        'Dm7': { notes: [62, 65, 69, 72], fingers: [1, 2, 3, 5] },  // D F A C
        'Ddim': { notes: [62, 65, 68], fingers: [1, 2, 4] },     // D F Ab

        'E': { notes: [64, 68, 71], fingers: [1, 3, 5] },        // E G# B
        'Em': { notes: [64, 67, 71], fingers: [1, 2, 5] },       // E G B
        'E7': { notes: [64, 68, 71, 74], fingers: [1, 2, 3, 5] },   // E G# B D
        'EM7': { notes: [64, 68, 71, 75], fingers: [1, 2, 3, 5] },  // E G# B D#
        'Em7': { notes: [64, 67, 71, 74], fingers: [1, 2, 3, 5] },  // E G B D
        'Edim': { notes: [64, 67, 70], fingers: [1, 2, 4] },     // E G Bb

        'F': { notes: [65, 69, 72], fingers: [1, 3, 5] },        // F A C
        'Fm': { notes: [65, 68, 72], fingers: [1, 2, 5] },       // F Ab C
        'F7': { notes: [65, 69, 72, 75], fingers: [1, 2, 3, 5] },   // F A C Eb
        'FM7': { notes: [65, 69, 72, 76], fingers: [1, 2, 3, 5] },  // F A C E
        'Fm7': { notes: [65, 68, 72, 75], fingers: [1, 2, 3, 5] },  // F Ab C Eb
        'Fdim': { notes: [65, 68, 71], fingers: [1, 2, 4] },     // F Ab B

        'G': { notes: [67, 71, 74], fingers: [1, 3, 5] },        // G B D
        'Gm': { notes: [67, 70, 74], fingers: [1, 2, 5] },       // G Bb D
        'G7': { notes: [67, 71, 74, 77], fingers: [1, 2, 3, 5] },   // G B D F
        'GM7': { notes: [67, 71, 74, 78], fingers: [1, 2, 3, 5] },  // G B D F#
        'Gm7': { notes: [67, 70, 74, 77], fingers: [1, 2, 3, 5] },  // G Bb D F
        'Gdim': { notes: [67, 70, 73], fingers: [1, 2, 4] },     // G Bb Db

        'A': { notes: [69, 73, 76], fingers: [1, 3, 5] },        // A C# E
        'Am': { notes: [69, 72, 76], fingers: [1, 2, 5] },       // A C E
        'A7': { notes: [69, 73, 76, 79], fingers: [1, 2, 3, 5] },   // A C# E G
        'AM7': { notes: [69, 73, 76, 80], fingers: [1, 2, 3, 5] },  // A C# E G#
        'Am7': { notes: [69, 72, 76, 79], fingers: [1, 2, 3, 5] },  // A C E G
        'Adim': { notes: [69, 72, 75], fingers: [1, 2, 4] },     // A C Eb

        'B': { notes: [71, 75, 78], fingers: [1, 3, 5] },        // B D# F#
        'Bm': { notes: [71, 74, 78], fingers: [1, 2, 5] },       // B D F#
        'B7': { notes: [71, 75, 78, 81], fingers: [1, 2, 3, 5] },   // B D# F# A
        'BM7': { notes: [71, 75, 78, 82], fingers: [1, 2, 3, 5] },  // B D# F# A#
        'Bm7': { notes: [71, 74, 78, 81], fingers: [1, 2, 3, 5] },  // B D F# A
        'Bdim': { notes: [71, 74, 77], fingers: [1, 2, 4] }      // B D F
    };

    // Fonction utilitaire pour obtenir le symbole de l'accord
    const getChordSymbol = (type) => {
        switch (type) {
            case 'major': return '';
            case 'minor': return 'm';
            case 'diminished': return '°';
            case 'dominant7': return '7';
            case 'diminished7': return '°7';
            case 'minor7': return 'm7';
            case 'major7': return 'maj7';
            case 'dominant9': return '9';
            case 'minor9': return 'm9';
            case 'minor7b5': return 'm7b5';
            default: return '';
        }
    };

    // Générer une progression aléatoire
    const generateProgression = () => {
        // Arrêter le métronome précédent
        toggleMetronome(false);
        
        // Réinitialiser les variables de timing
        isFirstChord = true;
        beatCount = 0;
        
        // Générer nouveau BPM
        currentBPM = generateRandomBPM(tempoRangeSelect.value);
        bpmValue.textContent = currentBPM;
        
        // Générer nouvelle progression
        const scaleType = scaleTypeSelect.value;
        const root = scaleRootSelect.value;
        const length = parseInt(lengthInput.value);
        
        currentProgression = [];
        const availableChords = Object.keys(chordDefinitions);
        
        for (let i = 0; i < length; i++) {
            const chordRoot = availableChords[Math.floor(Math.random() * availableChords.length)];
            currentProgression.push({
                root: chordRoot,
                notes: chordDefinitions[chordRoot].notes
            });
        }
        
        // Réinitialiser l'état
        currentChordIndex = 0;
        speedScore = 0;
        resetTimingErrors();
        
        // Mettre à jour l'affichage
        displayProgression();
        updateStats();
        
        // Démarrer le métronome
        toggleMetronome(true);
    };

    // Afficher la progression
    const displayProgression = () => {
        chordSequenceDiv.innerHTML = currentProgression.map((chord, index) => `
            <div class="sequence-chord ${index === currentChordIndex ? 'current' : ''}"
                 data-index="${index}">
                ${chord.root}
            </div>
        `).join('');
        highlightCurrentChord();
    };

    // Mettre en évidence l'accord actuel
    const highlightCurrentChord = () => {
        if (currentProgression.length === 0) return;
        
        // Mettre à jour la classe 'current' sur les accords de la séquence
        document.querySelectorAll('.sequence-chord').forEach((div, index) => {
            div.classList.toggle('current', index === currentChordIndex);
        });
        
        const chord = currentProgression[currentChordIndex];
        currentChordDiv.textContent = `Jouez : ${chord.root}`;
        
        // Effacer les anciennes mises en évidence et numéros de doigts
        document.querySelectorAll('.chord-highlight').forEach(key => {
            key.classList.remove('chord-highlight');
        });
        document.querySelectorAll('.finger-number').forEach(num => {
            num.remove();
        });
        
        // Ajouter les nouvelles mises en évidence et numéros de doigts
        const notes = chord.notes;
        notes.forEach((note, index) => {
            const noteName = midiNoteToNoteName(note);
            const key = document.querySelector(`[data-note="${noteName}"]`);
            if (key) {
                key.classList.add('chord-highlight');
                
                // Ajouter le numéro de doigt
                const fingerNumber = document.createElement('div');
                fingerNumber.className = 'finger-number';
                fingerNumber.textContent = chordDefinitions[chord.root].fingers[index];
                key.appendChild(fingerNumber);
            }
        });
    };

    // Vérifier si l'accord est correctement joué
    const checkChord = () => {
        if (!currentProgression.length) return;
        
        const chord = currentProgression[currentChordIndex];
        const expectedNotes = new Set(chord.notes.map(note => midiNoteToNoteName(note)));
        
        const isCorrect = activeNotes.size === expectedNotes.size &&
            [...activeNotes].every(note => expectedNotes.has(note));
        
        if (isCorrect) {
            const currentTime = audioContext.currentTime;
            const currentScore = calculateSpeedScore(currentTime);
            speedScore += currentScore;
            
            // Mettre à jour les statistiques
            chordsCompleted++;
            currentStreak++;
            bestStreak = Math.max(bestStreak, currentStreak);
            
            // Passer à l'accord suivant
            currentChordIndex = (currentChordIndex + 1) % currentProgression.length;
            
            // Si on a terminé la progression
            if (currentChordIndex === 0) {
                const avgSpeedScore = Math.floor(speedScore / currentProgression.length);
                saveProgress(avgSpeedScore, currentBPM);
                const analysis = analyzePerformance(avgSpeedScore, currentBPM);
                const errorDetails = analyzeTimingErrors();
                const message = `Progression terminée !\n\n` +
                    `Score timing : ${avgSpeedScore}%\n` +
                    `Tempo : ${currentBPM} BPM\n` +
                    `Série : ${currentStreak}\n\n` +
                    `${analysis}\n\n` +
                    `${errorDetails}`;
                
                setTimeout(() => {
                    alert(message);
                    toggleMetronome(false);
                }, 500);
                
                // Réinitialiser pour la prochaine progression
                chordsCompleted = 0;
                currentStreak = 0;
                speedScore = 0;
                isFirstChord = true;
                resetTimingErrors();
            }
            
            displayProgression();
            updateStats();
        }
    };

    // Mettre à jour l'affichage des statistiques
    const updateStats = () => {
        const total = currentProgression.length;
        accuracyDiv.textContent = `Accords réussis : ${chordsCompleted}/${total}`;
        streakDiv.textContent = `Série actuelle : ${currentStreak}`;
        const avgSpeedScore = currentProgression.length > 0 ? 
            Math.floor(speedScore / chordsCompleted || 0) : 0;
        speedScoreDiv.textContent = `Score timing : ${avgSpeedScore}%`;
    };

    // Réinitialiser les statistiques
    const resetStats = () => {
        chordsCompleted = 0;
        currentStreak = 0;
        bestStreak = 0;
        speedScore = 0;
        updateStats();
        toggleMetronome(false);
    };

    // Gestionnaire d'événements MIDI
    const onMIDIMessage = (message) => {
        const [status, note, velocity] = message.data;
        const noteFullName = midiNoteToNoteName(note);
        
        // Note On avec vélocité > 0
        if ((status & 0xf0) === 0x90 && velocity > 0) {
            // Jouer le son immédiatement
            playSound(note, velocity);
            
            // Ajouter la note à l'ensemble des notes actives
            activeNotes.add(noteFullName);
            const key = document.querySelector(`[data-note="${noteFullName}"]`);
            if (key) {
                key.classList.add('active');
                // Vérifier si la note fait partie de l'accord actuel (si un accord est sélectionné)
                if (currentProgression[currentChordIndex] && 
                    currentProgression[currentChordIndex].notes.some(note => 
                        midiNoteToNoteName(note) === noteFullName)) {
                    key.classList.add('played-correct');
                }
            }
            // Vérifier l'accord seulement si une progression est active
            if (currentProgression.length > 0) {
                checkChord();
            }
        } 
        // Note Off ou Note On avec vélocité 0
        else if ((status & 0xf0) === 0x80 || (status & 0xf0) === 0x90 && velocity === 0) {
            activeNotes.delete(noteFullName);
            const key = document.querySelector(`[data-note="${noteFullName}"]`);
            if (key) {
                key.classList.remove('active', 'played-correct');
            }
        }
    };

    // Utilitaires
    const noteNameToMidiNote = (noteName) => {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = parseInt(noteName.slice(-1));
        const note = noteName.slice(0, -1);
        return notes.indexOf(note) + (octave + 1) * 12;
    };

    const midiNoteToNoteName = (midiNote) => {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const note = notes[midiNote % 12];
        return note + octave;
    };

    // Gestion des progrès
    const STORAGE_KEY = 'groovykeys_progress';
    let progressChart = null;

    // Sauvegarder un score
    const saveProgress = (score, tempo) => {
        const progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        progress.push({
            date: new Date().toISOString(),
            score: score,
            tempo: tempo
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    };

    // Charger les données de progrès pour une période
    const loadProgress = (period) => {
        const progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const now = new Date();
        const periods = {
            'week': 7,
            'month': 30,
            'sixMonths': 180,
            'year': 365
        };
        
        const cutoffDate = new Date(now.setDate(now.getDate() - periods[period]));
        return progress.filter(p => new Date(p.date) >= cutoffDate);
    };

    // Calculer les statistiques
    const calculateStats = (data) => {
        if (data.length === 0) return { avg: 0, best: 0, total: 0 };
        
        const scores = data.map(p => p.score);
        return {
            avg: Math.round(scores.reduce((a, b) => a + b) / scores.length),
            best: Math.max(...scores),
            total: data.length
        };
    };

    // Mettre à jour le graphique
    const updateChart = (period) => {
        const data = loadProgress(period);
        const ctx = document.getElementById('progress-chart').getContext('2d');
        
        // Grouper les données par jour
        const groupedData = data.reduce((acc, item) => {
            const date = item.date.split('T')[0];
            if (!acc[date]) {
                acc[date] = { scores: [], tempos: [] };
            }
            acc[date].scores.push(item.score);
            acc[date].tempos.push(item.tempo);
            return acc;
        }, {});

        // Préparer les données pour le graphique
        const chartData = Object.entries(groupedData).map(([date, data]) => ({
            x: new Date(date),
            y: Math.round(data.scores.reduce((a, b) => a + b) / data.scores.length),
            tempo: Math.round(data.tempos.reduce((a, b) => a + b) / data.tempos.length)
        }));

        // Mettre à jour ou créer le graphique
        if (progressChart) {
            progressChart.destroy();
        }

        progressChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Score Timing',
                    data: chartData,
                    borderColor: '#45b7d1',
                    backgroundColor: 'rgba(69, 183, 209, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: period === 'week' ? 'day' : 'week',
                            displayFormats: {
                                day: 'dd/MM',
                                week: 'DD/MM'
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#f4f4f4'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#f4f4f4'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const point = context.raw;
                                return [
                                    `Score: ${point.y}%`,
                                    `Tempo: ${point.tempo} BPM`
                                ];
                            }
                        }
                    },
                    legend: {
                        labels: {
                            color: '#f4f4f4'
                        }
                    }
                }
            }
        });

        // Mettre à jour les statistiques
        const stats = calculateStats(data);
        document.getElementById('avg-score').textContent = `${stats.avg}%`;
        document.getElementById('best-score').textContent = `${stats.best}%`;
        document.getElementById('total-sessions').textContent = stats.total;
    };

    // Gestion des données
    const exportData = () => {
        const data = localStorage.getItem(STORAGE_KEY) || '[]';
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'groovykeys_progress.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importData = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                    updateChart(document.querySelector('.period-btn.active').dataset.period);
                    alert('Données importées avec succès !');
                } else {
                    throw new Error('Format invalide');
                }
            } catch (err) {
                alert('Erreur lors de l\'importation : fichier invalide');
            }
        };
        reader.readAsText(file);
    };

    // Event listeners pour l'export/import
    document.getElementById('export-data').addEventListener('click', exportData);
    
    document.getElementById('import-data').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    
    document.getElementById('import-file').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importData(e.target.files[0]);
        }
    });

    // Gestionnaire du modal
    const modal = document.getElementById('progress-modal');
    const showProgressBtn = document.getElementById('show-progress');
    const closeBtn = document.querySelector('.close');
    const periodBtns = document.querySelectorAll('.period-btn');

    showProgressBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        updateChart('week'); // Charger les données de la semaine par défaut
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateChart(btn.dataset.period);
        });
    });

    // Event Listeners
    generateButton.addEventListener('click', () => {
        // Démarrer le contexte audio si nécessaire
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        generateProgression();
    });
    resetButton.addEventListener('click', resetStats);

    // Réinitialiser les erreurs pour une nouvelle progression
    const resetTimingErrors = () => {
        timingErrors = {
            early: 0,
            late: 0,
            totalDeviation: 0,
            maxDeviation: 0,
            deviations: []
        };
    };

    // Fonction d'analyse détaillée des erreurs
    const analyzeTimingErrors = () => {
        const totalBeats = timingErrors.deviations.length;
        if (totalBeats === 0) return '';

        const avgDeviation = timingErrors.totalDeviation / totalBeats;
        const avgDeviationMs = Math.round(avgDeviation * 1000);
        const maxDeviationMs = Math.round(timingErrors.maxDeviation * 1000);
        
        // Trouver les temps les plus problématiques
        const worstBeats = timingErrors.deviations
            .sort((a, b) => b.deviation - a.deviation)
            .slice(0, 3)
            .map(d => ({
                beat: d.beat,
                ms: Math.round(d.deviation * 1000),
                direction: d.direction
            }));

        let errorAnalysis = `Analyse détaillée :\n`;
        errorAnalysis += `• ${timingErrors.early} fois en avance, ${timingErrors.late} fois en retard\n`;
        errorAnalysis += `• Écart moyen : ${avgDeviationMs}ms\n`;
        errorAnalysis += `• Écart maximum : ${maxDeviationMs}ms\n\n`;
        
        if (worstBeats.length > 0) {
            errorAnalysis += `Temps les plus difficiles :\n`;
            worstBeats.forEach(beat => {
                errorAnalysis += `• Temps ${beat.beat} : ${beat.ms}ms ${beat.direction === 'early' ? 'trop tôt' : 'trop tard'}\n`;
            });
        }

        // Conseils spécifiques basés sur les erreurs
        let specificAdvice = '\nConseils spécifiques :\n';
        if (timingErrors.early > timingErrors.late) {
            specificAdvice += '• Vous avez tendance à jouer trop tôt. Essayez d\'attendre le clic du métronome.\n';
        } else if (timingErrors.late > timingErrors.early) {
            specificAdvice += '• Vous avez tendance à jouer en retard. Anticipez légèrement le temps suivant.\n';
        }

        if (avgDeviationMs > 100) {
            specificAdvice += '• Vos écarts sont importants. Commencez par un tempo plus lent pour plus de précision.\n';
        } else if (maxDeviationMs > 200) {
            specificAdvice += '• Certains temps sont très décalés. Concentrez-vous sur la régularité.\n';
        }

        return errorAnalysis + specificAdvice;
    };

    // Générer un message d'analyse et des conseils
    const analyzePerformance = (score, tempo) => {
        let analysis = '';
        let advice = '';

        // Analyse du score
        if (score >= 90) {
            analysis = "Excellent ! Votre timing est presque parfait.";
            advice = tempo > 100 ? 
                "Essayez un tempo encore plus rapide pour vous challenger davantage." :
                "Vous maîtrisez ce tempo, tentez une vitesse supérieure !";
        } else if (score >= 75) {
            analysis = "Très bon score ! Vous avez un bon sens du rythme.";
            advice = "Pour progresser, concentrez-vous sur les temps forts du métronome.";
        } else if (score >= 60) {
            analysis = "Bon travail ! Votre timing s'améliore.";
            advice = "Essayez de taper du pied en rythme avec le métronome pendant que vous jouez.";
        } else if (score >= 40) {
            analysis = "Vous êtes sur la bonne voie !";
            advice = "Commencez par un tempo plus lent pour mieux intégrer le rythme.";
        } else {
            analysis = "Le timing est un aspect difficile, continuez à pratiquer !";
            advice = "Exercez-vous d'abord sans le piano, en tapant simplement en rythme avec le métronome.";
        }

        // Analyse du tempo
        let tempoAnalysis = '';
        if (tempo < 80) {
            tempoAnalysis = "Ce tempo lent est parfait pour travailler la précision.";
        } else if (tempo < 100) {
            tempoAnalysis = "Ce tempo modéré est idéal pour développer votre aisance.";
        } else if (tempo < 120) {
            tempoAnalysis = "Ce tempo rapide met au défi votre dextérité.";
        } else {
            tempoAnalysis = "Ce tempo très rapide exige une excellente maîtrise !";
        }

        return `${analysis}\n${tempoAnalysis}\n\nConseil : ${advice}`;
    };

    // Initialisation
    createPiano();
    loadSounds();
    setupMIDI();
});
