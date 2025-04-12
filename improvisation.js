document.addEventListener('DOMContentLoaded', () => {
    // Boutons de commande - sélection directe et isolation des variables
    const generateButton = document.getElementById('generate-progression');
    const resetButton = document.getElementById('reset-stats');
    const showProgressBtn = document.getElementById('show-progress');

    // Configuration initiale
    const pianoDiv = document.getElementById('piano');
    const chordSequenceDiv = document.getElementById('chord-sequence');
    const currentChordDiv = document.getElementById('current-chord');
    const scaleTypeSelect = document.getElementById('practice-scale-type');
    const scaleRootSelect = document.getElementById('practice-scale-root');
    const lengthInput = document.getElementById('progression-length');
    const tempoRangeSelect = document.getElementById('tempo-range');
    const accuracyDiv = document.getElementById('accuracy');
    const streakDiv = document.getElementById('streak');
    const speedScoreDiv = document.getElementById('speed-score');
    const bpmValue = document.getElementById('bpm-value');
    const beatDots = document.querySelectorAll('.beat-dot');
    
    // Références pour la modale de progrès et ses boutons
    const modal = document.getElementById('progress-modal');
    const closeBtn = document.querySelector('.close');
    const periodBtns = document.querySelectorAll('.period-btn');

    // Contexte audio pour le métronome
    let audioContext;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.error('Web Audio API non supportée:', e);
    }

    let currentNoteSequence = [];
    let currentNoteIndex = 0;
    let notesCompleted = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let scorePoints = 0;
    let wrongNotes = 0;
    let totalNotes = 0;
    let rhythmScores = [];
    let activeNotes = new Set();
    let pianoSounds = {};
    let metronomeInterval = null;
    let currentBeat = 0;
    let currentBPM = 90;
    let lastNoteTime = 0;

    // Variables pour le timing
    let isFirstNote = true;
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
    const calculateSpeedScore = (noteTime) => {
        if (isFirstNote) {
            // Pour la première note, on synchronise avec le prochain temps
            const currentBeat = audioContext.currentTime;
            const beatInterval = 60 / currentBPM;
            nextBeatTime = currentBeat + beatInterval;
            isFirstNote = false;
            return 100; // Premier accord toujours correct
        }

        // Calculer l'écart avec le temps le plus proche
        const beatInterval = 60 / currentBPM;
        const expectedTime = nextBeatTime;
        const timeDiff = Math.abs(noteTime - expectedTime);
        
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
            isFirstNote = true;
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

                // Ajout du nom de la note avec l'octave
                const noteNameDiv = document.createElement('div');
                noteNameDiv.className = 'note-name';
                noteNameDiv.textContent = noteName;
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

    // Définition des notes MIDI pour chaque gamme
    const scaleDefinitions = {
        'major': [0, 2, 4, 5, 7, 9, 11], // Do, Ré, Mi, Fa, Sol, La, Si
        'minor': [0, 2, 3, 5, 7, 8, 10], // Do, Ré, Mib, Fa, Sol, Lab, Sib
        'blues': [0, 3, 5, 6, 7, 10],    // Do, Mib, Fa, Fa#, Sol, Sib
        'lofi': [0, 2, 3, 5, 7, 10]      // Do, Ré, Mib, Fa, Sol, Sib (Mineur dorien)
    };

    // Conversion de nom de note vers numéro MIDI
    const noteNameToMidiNote = (noteName) => {
        const notes = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
        const note = noteName.slice(0, -1);
        const octave = parseInt(noteName.slice(-1));
        return notes[note] + (octave + 1) * 12;
    };

    // Conversion de numéro MIDI vers nom de note
    const midiNoteToNoteName = (midiNote) => {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const note = notes[midiNote % 12];
        return note + octave;
    };

    // Générer une séquence de notes aléatoire
    const generateNoteSequence = () => {
        // Arrêter le métronome précédent
        toggleMetronome(false);
        
        // Réinitialiser les variables de timing
        isFirstNote = true;
        beatCount = 0;
        
        // Générer nouveau BPM
        currentBPM = generateRandomBPM(tempoRangeSelect.value);
        bpmValue.textContent = currentBPM;
        
        // Générer nouvelle séquence de notes
        const scaleType = scaleTypeSelect.value;
        const root = scaleRootSelect.value;
        const length = parseInt(lengthInput.value);
        
        // Déterminer la gamme à utiliser
        const rootNote = noteNameToMidiNote(root + '4');
        const scalePattern = scaleDefinitions[scaleType];
        const scaleNotes = scalePattern.map(interval => rootNote + interval);
        
        // Générer la séquence de notes
        currentNoteSequence = [];
        for (let i = 0; i < length; i++) {
            const randomNote = scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
            const noteName = midiNoteToNoteName(randomNote);
            currentNoteSequence.push({
                midiNote: randomNote,
                noteName: noteName
            });
        }
        
        // Réinitialiser l'état
        currentNoteIndex = 0;
        scorePoints = 0;
        wrongNotes = 0;
        totalNotes = 0;
        rhythmScores = [];
        resetTimingErrors();
        
        // Mettre à jour l'affichage
        displayNoteSequence();
        updateStats();
        
        // Démarrer le métronome
        toggleMetronome(true);
    };

    // Afficher la séquence de notes
    const displayNoteSequence = () => {
        chordSequenceDiv.innerHTML = currentNoteSequence.map((note, index) => `
            <div class="sequence-chord ${index === currentNoteIndex ? 'current' : ''}"
                 data-index="${index}">
                ${note.noteName}
            </div>
        `).join('');
        highlightCurrentNote();
    };

    // Mettre en évidence la note actuelle
    const highlightCurrentNote = () => {
        if (currentNoteSequence.length === 0) return;
        
        // Mettre à jour la classe 'current' sur les notes de la séquence
        document.querySelectorAll('.sequence-chord').forEach((div, index) => {
            div.classList.toggle('current', index === currentNoteIndex);
        });
        
        const note = currentNoteSequence[currentNoteIndex];
        currentChordDiv.textContent = `Jouez : ${note.noteName}`;
        
        // Effacer les anciennes mises en évidence et numéros de doigts
        document.querySelectorAll('.chord-highlight').forEach(key => {
            key.classList.remove('chord-highlight');
        });
        document.querySelectorAll('.finger-number').forEach(elem => {
            elem.remove();
        });
        
        // Mettre en évidence la note actuelle sur le piano
        const keyElement = document.querySelector(`[data-note="${note.noteName}"]`);
        if (keyElement) {
            keyElement.classList.add('chord-highlight');
        }
    };

    // Réinitialiser le suivi des erreurs de timing
    const resetTimingErrors = () => {
        timingErrors = {
            early: 0,
            late: 0,
            totalDeviation: 0,
            maxDeviation: 0,
            deviations: []
        };
    };

    // Mettre à jour les statistiques
    const updateStats = () => {
        accuracyDiv.textContent = `Réussis: ${notesCompleted}/${currentNoteSequence.length}`;
        streakDiv.textContent = `Série: ${currentStreak}`;
        const rhythmPercentage = calculateRhythmPercentage();
        speedScoreDiv.textContent = `Score: ${scorePoints} (Rythme: ${rhythmPercentage}%)`;
    };

    // Gérer les messages MIDI
    const onMIDIMessage = (message) => {
        const [status, note, velocity] = message.data;
        const isNoteOn = (status & 0xf0) === 0x90 && velocity > 0;
        const isNoteOff = (status & 0xf0) === 0x80 || ((status & 0xf0) === 0x90 && velocity === 0);
        
        if (isNoteOn) {
            noteOn(note, velocity);
        } else if (isNoteOff) {
            noteOff(note);
        }
    };

    // Activer une note
    const noteOn = (note, velocity) => {
        // Jouer le son
        playSound(note, velocity);
        
        // Ajouter la note aux notes actives
        activeNotes.add(note);
        
        // Mettre en évidence la touche
        const noteName = midiNoteToNoteName(note);
        const keyElement = document.querySelector(`[data-note="${noteName}"]`);
        if (keyElement) {
            keyElement.classList.add('active');
        }
        
        // Vérifier si c'est la note attendue
        checkNote(note);
    };

    // Désactiver une note
    const noteOff = (note) => {
        // Retirer la note des notes actives
        activeNotes.delete(note);
        
        // Supprimer la mise en évidence de la touche
        const noteName = midiNoteToNoteName(note);
        const keyElement = document.querySelector(`[data-note="${noteName}"]`);
        if (keyElement) {
            keyElement.classList.remove('active');
        }
    };

    // Vérifier si la note jouée correspond à celle attendue
    const checkNote = (note) => {
        if (currentNoteSequence.length === 0 || currentNoteIndex >= currentNoteSequence.length) return;
        
        const expectedNote = currentNoteSequence[currentNoteIndex];
        if (note === expectedNote.midiNote) {
            // Ajouter 2 points pour une bonne note
            scorePoints += 2;
            
            // Calcul du score de timing
            const noteTime = audioContext.currentTime;
            const rhythmScore = calculateSpeedScore(noteTime);
            rhythmScores.push(rhythmScore);
            
            // Mettre à jour les statistiques
            notesCompleted++;
            currentStreak++;
            bestStreak = Math.max(bestStreak, currentStreak);
            totalNotes++;
            
            // Passer à la note suivante
            currentNoteIndex++;
            if (currentNoteIndex >= currentNoteSequence.length) {
                // Fin de la séquence
                setTimeout(() => {
                    const rhythmPercentage = calculateRhythmPercentage();
                    alert(`Séquence terminée!\nScore: ${scorePoints} points\nRespect du rythme: ${rhythmPercentage}%`);
                    toggleMetronome(false);
                }, 500);
            } else {
                // Afficher la note suivante
                highlightCurrentNote();
            }
            
            // Mettre à jour l'affichage
            updateStats();
            displayNoteSequence();
        } else {
            // Soustraire 1 point pour une mauvaise note
            scorePoints = Math.max(0, scorePoints - 1);
            wrongNotes++;
            totalNotes++;
            currentStreak = 0; // Réinitialiser la série
            updateStats();
        }
    };
    
    // Calcul du pourcentage de respect du rythme
    const calculateRhythmPercentage = () => {
        if (rhythmScores.length === 0) return 0;
        const sum = rhythmScores.reduce((acc, score) => acc + score, 0);
        return Math.round((sum / (rhythmScores.length * 100)) * 100);
    };

    // Gestion des progrès
    const STORAGE_KEY = 'groovykeys_progress';
    let progressChart = null;

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
                            label: function(context) {
                                return `Score: ${context.parsed.y}% (BPM: ${context.raw.tempo})`;
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

    // Réinitialiser les statistiques
    const resetStats = () => {
        // Réinitialisation des compteurs
        notesCompleted = 0;
        currentStreak = 0;
        scorePoints = 0;
        wrongNotes = 0;
        totalNotes = 0;
        rhythmScores = [];
        currentNoteSequence = [];
        currentNoteIndex = 0;
        isFirstNote = true;

        // Arrêter le métronome
        toggleMetronome(false);

        // Effacer l'affichage
        chordSequenceDiv.innerHTML = '';
        currentChordDiv.textContent = 'Note actuelle';

        // Supprimer les surbrillances
        document.querySelectorAll('.chord-highlight').forEach(el => el.classList.remove('chord-highlight'));
        document.querySelectorAll('.sequence-chord').forEach(el => el.classList.remove('current'));

        // Mise à jour des stats affichées
        updateStats();
    };

    // Exposition de la fonction resetStats à l'objet window global
    window.resetStats = resetStats;

    // Gestionnaire du modal - REMOVE ORIGINAL EVENT HANDLERS
    console.log('Setting up event handlers - new implementation');
    
    // Initialisations et chargements - REPLACE EXISTING EVENT HANDLERS
    function initializeApp() {
        // Exposition globale de la fonction generateNoteSequence
        window.generateNoteSequence = generateNoteSequence;
        
        createPiano();
        loadSounds().then(() => {
            setupMIDI();
            // Supprimer la génération automatique de séquence
            // generateNoteSequence();
        });

        // Ajouter de nouveaux gestionnaires d'événements propres
        if (generateButton) {
            generateButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Generate button clicked - NEW handler');
                generateNoteSequence(); // C'est bien ici que la génération devrait se lancer
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Reset button clicked - NEW handler');
                resetStats();
            });
        }

        if (showProgressBtn) {
            showProgressBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Progress button clicked - NEW handler');
                if (modal) {
                    modal.style.display = 'block';
                    updateChart('week');
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Gestionnaire spécifique pour le tempo
        if (tempoRangeSelect) {
            tempoRangeSelect.addEventListener('change', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Tempo changed - NEW handler');
                // Mettre à jour le BPM sans régénérer la séquence
                currentBPM = generateRandomBPM(tempoRangeSelect.value);
                if (bpmValue) bpmValue.textContent = currentBPM;
                
                // Réinitialiser le métronome avec le nouveau BPM
                if (metronomeInterval) {
                    toggleMetronome(false);
                    toggleMetronome(true);
                }
            });
        }

        // Gestionnaires pour éviter la régénération accidentelle
        if (scaleTypeSelect) {
            scaleTypeSelect.addEventListener('change', function(e) {
                e.preventDefault();
                e.stopPropagation();
                // Ne rien faire - juste empêcher la propagation
            });
        }

        if (scaleRootSelect) {
            scaleRootSelect.addEventListener('change', function(e) {
                e.preventDefault();
                e.stopPropagation();
                // Ne rien faire - juste empêcher la propagation
            });
        }

        if (lengthInput) {
            lengthInput.addEventListener('change', function(e) {
                e.preventDefault();
                e.stopPropagation();
                // Ne rien faire - juste empêcher la propagation
            });
            lengthInput.addEventListener('input', function(e) {
                e.preventDefault();
                e.stopPropagation();
                // Ne rien faire - juste empêcher la propagation
            });
        }

        // Gestionnaire pour la fenêtre
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Gestionnaires pour les boutons de période
        periodBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                periodBtns.forEach(function(b) { 
                    b.classList.remove('active'); 
                });
                btn.classList.add('active');
                if (typeof updateChart === 'function') {
                    updateChart(btn.dataset.period);
                }
            });
        });
        
        console.log('All event listeners successfully attached - NEW implementation');
    }
    
    // Lancer l'initialisation après le chargement du DOM
    initializeApp();
});
