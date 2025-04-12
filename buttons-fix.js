// Script dédié exclusivement à la correction des boutons problématiques
// Le chargement à la fin du body garantit que tous les éléments existent déjà

document.addEventListener('DOMContentLoaded', function() {
    console.log('Fixing buttons behavior - Standalone script');
    
    // Variable pour protéger contre les générations accidentelles
    window.lastGenerationTime = 0;
    
    // Sélection directe des boutons par ID
    const generateBtn = document.getElementById('generate-progression');
    const resetBtn = document.getElementById('reset-stats');
    const progressBtn = document.getElementById('show-progress');
    const tempoRangeSelect = document.getElementById('tempo-range');
    const scaleTypeSelect = document.getElementById('practice-scale-type');
    const scaleRootSelect = document.getElementById('practice-scale-root');
    const lengthInput = document.getElementById('progression-length');
    const modal = document.getElementById('progress-modal');
    const closeBtn = document.querySelector('.close');
    
    console.log('Buttons found:', {
        generate: generateBtn,
        reset: resetBtn,
        progress: progressBtn,
        tempoRange: tempoRangeSelect,
        modal: modal,
        close: closeBtn
    });
    
    // Supprimer tous les écouteurs d'événements existants
    function recreateNode(el) {
        if (!el) return null;
        var newEl = el.cloneNode(true);
        if (el.parentNode) {
            el.parentNode.replaceChild(newEl, el);
        }
        return newEl;
    }
    
    // Récréer les boutons pour supprimer tous les écouteurs existants
    const newGenerateBtn = recreateNode(generateBtn);
    const newResetBtn = recreateNode(resetBtn);
    const newProgressBtn = recreateNode(progressBtn);
    const newCloseBtn = recreateNode(closeBtn);
    const newTempoRangeSelect = recreateNode(tempoRangeSelect);
    const newScaleTypeSelect = recreateNode(scaleTypeSelect);
    const newScaleRootSelect = recreateNode(scaleRootSelect);
    const newLengthInput = recreateNode(lengthInput);
    
    // Fonctions de callback clairement définies et isolées
    function generateClickHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Protection contre double-clic ou déclenchement accidentel
        const now = Date.now();
        if (now - window.lastGenerationTime < 500) {
            console.log('Generation throttled - too soon');
            return;
        }
        window.lastGenerationTime = now;
        
        console.log('Generate button clicked');
        if (typeof generateNoteSequence === 'function') {
            generateNoteSequence();
        } else {
            console.error('generateNoteSequence function not found');
        }
    }
    
    function resetClickHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Reset button clicked');
        // Réinitialisation directe des variables globales
        window.notesCompleted = 0;
        window.currentStreak = 0;
        window.scorePoints = 0;
        window.wrongNotes = 0;
        window.totalNotes = 0;
        window.rhythmScores = [];
        if (typeof updateStats === 'function') {
            updateStats();
        } else {
            console.error('updateStats function not found');
            // Fallback: mise à jour directe des éléments HTML
            const accuracyDiv = document.getElementById('accuracy');
            const streakDiv = document.getElementById('streak');
            const speedScoreDiv = document.getElementById('speed-score');
            if (accuracyDiv) accuracyDiv.textContent = 'Réussis: 0/0';
            if (streakDiv) streakDiv.textContent = 'Série: 0';
            if (speedScoreDiv) speedScoreDiv.textContent = 'Score: 0 (Rythme: 0%)';
        }
    }
    
    function progressClickHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Progress button clicked');
        if (modal) {
            modal.style.display = 'block';
            if (typeof updateChart === 'function') {
                updateChart('week');
            }
        }
    }
    
    function closeClickHandler(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // Gestionnaire de changement de tempo isolé
    function tempoChangeHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Tempo range changed');
        // Mise à jour du BPM sans générer une nouvelle séquence
        if (typeof generateRandomBPM === 'function' && window.currentBPM !== undefined) {
            window.currentBPM = generateRandomBPM(newTempoRangeSelect.value);
            const bpmValue = document.getElementById('bpm-value');
            if (bpmValue) bpmValue.textContent = window.currentBPM;
            
            // Mettre à jour le métronome si nécessaire
            if (typeof toggleMetronome === 'function' && window.metronomeInterval) {
                toggleMetronome(false); // Arrêter
                toggleMetronome(true);  // Redémarrer avec le nouveau BPM
            }
        }
    }
    
    // Empêcher les sélecteurs de gamme/note de déclencher une génération
    function scaleChangeHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Scale selection changed - not generating new sequence');
        // Ne rien faire ici - juste empêcher la propagation
    }
    
    function lengthChangeHandler(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Length changed - not generating new sequence');
        // Ne rien faire ici - juste empêcher la propagation
    }
    
    // Ajout des nouveaux gestionnaires d'événements avec protection
    if (newGenerateBtn) {
        newGenerateBtn.addEventListener('click', generateClickHandler);
    }
    
    if (newResetBtn) {
        newResetBtn.addEventListener('click', resetClickHandler);
    }
    
    if (newProgressBtn) {
        newProgressBtn.addEventListener('click', progressClickHandler);
    }
    
    if (newCloseBtn) {
        newCloseBtn.addEventListener('click', closeClickHandler);
    }
    
    // Gestionnaires spécifiques pour les éléments de configuration
    if (newTempoRangeSelect) {
        newTempoRangeSelect.addEventListener('change', tempoChangeHandler);
    }
    
    if (newScaleTypeSelect) {
        newScaleTypeSelect.addEventListener('change', scaleChangeHandler);
    }
    
    if (newScaleRootSelect) {
        newScaleRootSelect.addEventListener('change', scaleChangeHandler);
    }
    
    if (newLengthInput) {
        newLengthInput.addEventListener('change', lengthChangeHandler);
        newLengthInput.addEventListener('input', lengthChangeHandler);
    }
    
    // Écouteur d'événement pour la fenêtre (fermer la modal en cliquant à l'extérieur)
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Réattacher les gestionnaires pour les boutons de période
    const periodBtns = document.querySelectorAll('.period-btn');
    periodBtns.forEach(function(btn) {
        const newBtn = recreateNode(btn);
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            periodBtns.forEach(function(b) { 
                b.classList.remove('active'); 
            });
            newBtn.classList.add('active');
            if (typeof updateChart === 'function') {
                updateChart(newBtn.dataset.period);
            }
        });
    });
    
    console.log('All event listeners successfully attached');
});
