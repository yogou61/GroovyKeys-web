document.addEventListener('DOMContentLoaded', function() {
    const generateButton = document.getElementById('generate-button');
    const promptInput = document.getElementById('music-prompt');
    const genreSelector = document.getElementById('genre');
    const instrumentSelector = document.getElementById('instrument');
    const loadingIndicator = document.getElementById('loading');
    const tracksContainer = document.getElementById('tracks-container');
    
    // Historique des pistes générées
    let generatedTracks = [];
    
    // Effacer l'historique existant pour éviter les problèmes avec les anciennes URL
    localStorage.removeItem('musicfyTracks');
    
    // Charger l'historique depuis le localStorage s'il existe
    if (localStorage.getItem('musicfyTracks')) {
        try {
            generatedTracks = JSON.parse(localStorage.getItem('musicfyTracks'));
            renderTracks(); // Afficher les pistes sauvegardées
        } catch (error) {
            console.error('Erreur lors du chargement de l\'historique:', error);
        }
    }
    
    generateButton.addEventListener('click', generateMusic);
    
    // Permettre la génération en appuyant sur Entrée dans le champ de saisie
    promptInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateMusic();
        }
    });
    
    // Démonstration avec fichiers audio accessibles publiquement
    const demoTracks = [
        { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', type: 'music' },
        { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', type: 'music' },
        { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', type: 'music' },
        { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', type: 'music' }
    ];
    
    function generateMusic() {
        // Vérifier si le prompt est vide
        if (!promptInput.value.trim()) {
            alert('Veuillez entrer une description pour la musique que vous souhaitez générer.');
            return;
        }
        
        // Construire le prompt avec le genre et l'instrument si spécifiés
        let fullPrompt = promptInput.value.trim();
        
        if (genreSelector.value) {
            fullPrompt += `, ${genreSelector.value} style`;
        }
        
        if (instrumentSelector.value) {
            fullPrompt += `, with ${instrumentSelector.value}`;
        }
        
        // Afficher l'indicateur de chargement
        loadingIndicator.style.display = 'flex';
        tracksContainer.querySelector('.empty-state')?.remove();
        
        // Simulation d'un délai d'API (pour une meilleure expérience utilisateur)
        setTimeout(() => {
            // Masquer l'indicateur de chargement
            loadingIndicator.style.display = 'none';
            
            // Sélectionner aléatoirement 1 ou 2 pistes de démonstration
            const count = Math.floor(Math.random() * 2) + 1;
            const selectedDemoTracks = [];
            
            // Sélectionner des pistes aléatoires
            for (let i = 0; i < count; i++) {
                const randomIndex = Math.floor(Math.random() * demoTracks.length);
                selectedDemoTracks.push(demoTracks[randomIndex]);
            }
            
            // Ajouter les pistes à l'historique
            const newTracks = selectedDemoTracks.map(track => {
                return {
                    id: generateUniqueId(),
                    url: track.url,
                    type: track.type,
                    prompt: fullPrompt,
                    timestamp: new Date().toISOString()
                };
            });
            
            // Ajouter les nouvelles pistes au début de l'historique
            generatedTracks = [...newTracks, ...generatedTracks];
            
            // Limiter l'historique à 20 pistes
            if (generatedTracks.length > 20) {
                generatedTracks = generatedTracks.slice(0, 20);
            }
            
            // Sauvegarder dans le localStorage
            localStorage.setItem('musicfyTracks', JSON.stringify(generatedTracks));
            
            // Afficher les pistes
            renderTracks();
            
        }, 2000); // Simulation d'un délai de 2 secondes pour l'API
        
        /* COMMENTÉ : CODE ORIGINAL POUR L'API RÉELLE (à utiliser après déploiement sur serveur)
        // Configurer la requête API
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'VOTRE_CLE_API_ICI' // Insérez votre clé API ici
            },
            body: JSON.stringify({
                prompt: fullPrompt
            })
        };
        
        // Utiliser un proxy CORS pour contourner les restrictions CORS
        const corsProxyUrl = 'https://corsproxy.io/?';
        const apiUrl = 'https://api.musicfy.lol/v1/generate-music';
        
        // Envoyer la requête à l'API Musicfy via le proxy CORS
        fetch(corsProxyUrl + encodeURIComponent(apiUrl), options)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Masquer l'indicateur de chargement
                loadingIndicator.style.display = 'none';
                
                // Ajouter les nouvelles pistes générées
                if (data && Array.isArray(data) && data.length > 0) {
                    const newTracks = data.map(track => {
                        return {
                            id: generateUniqueId(),
                            url: track.file_url,
                            type: track.type,
                            prompt: fullPrompt,
                            timestamp: new Date().toISOString()
                        };
                    });
                    
                    // Ajouter les nouvelles pistes au début de l'historique
                    generatedTracks = [...newTracks, ...generatedTracks];
                    
                    // Limiter l'historique à 20 pistes
                    if (generatedTracks.length > 20) {
                        generatedTracks = generatedTracks.slice(0, 20);
                    }
                    
                    // Sauvegarder dans le localStorage
                    localStorage.setItem('musicfyTracks', JSON.stringify(generatedTracks));
                    
                    // Afficher les pistes
                    renderTracks();
                } else {
                    showError('Aucune piste n\'a été générée. Veuillez réessayer.');
                }
            })
            .catch(error => {
                console.error('Erreur lors de la génération:', error);
                loadingIndicator.style.display = 'none';
                showError('Erreur lors de la génération de la musique. Veuillez réessayer plus tard.');
            });
        */
    }
    
    function renderTracks() {
        // Nettoyer le conteneur
        tracksContainer.innerHTML = '';
        
        if (generatedTracks.length === 0) {
            tracksContainer.innerHTML = '<p class="empty-state">Cliquez sur "Générer" pour créer de la musique</p>';
            return;
        }
        
        // Créer un élément pour chaque piste
        generatedTracks.forEach(track => {
            const trackElement = document.createElement('div');
            trackElement.className = 'track-item';
            trackElement.innerHTML = `
                <div class="track-info">
                    <p class="track-prompt">${escapeHTML(track.prompt)}</p>
                    <p class="track-date">${formatDate(track.timestamp)}</p>
                </div>
                <div class="track-controls">
                    <audio controls src="${track.url}"></audio>
                    <button class="download-button" data-url="${track.url}" data-prompt="${escapeHTML(track.prompt)}">Télécharger</button>
                    <button class="delete-button" data-id="${track.id}">Supprimer</button>
                </div>
            `;
            tracksContainer.appendChild(trackElement);
        });
        
        // Ajouter des écouteurs d'événements pour les boutons de téléchargement et de suppression
        document.querySelectorAll('.download-button').forEach(button => {
            button.addEventListener('click', function() {
                downloadTrack(this.dataset.url, this.dataset.prompt);
            });
        });
        
        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', function() {
                deleteTrack(this.dataset.id);
            });
        });
    }
    
    function downloadTrack(url, prompt) {
        // Créer un lien temporaire pour télécharger le fichier
        const a = document.createElement('a');
        a.href = url;
        
        // Créer un nom de fichier basé sur le prompt
        const fileName = prompt
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .substring(0, 30) + '.mp3';
        
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    function deleteTrack(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette piste ?')) {
            generatedTracks = generatedTracks.filter(track => track.id !== id);
            localStorage.setItem('musicfyTracks', JSON.stringify(generatedTracks));
            renderTracks();
        }
    }
    
    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        tracksContainer.innerHTML = '';
        tracksContainer.appendChild(errorElement);
        
        // Masquer le message d'erreur après 5 secondes
        setTimeout(() => {
            errorElement.remove();
            renderTracks();
        }, 5000);
    }
    
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    
    function formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
