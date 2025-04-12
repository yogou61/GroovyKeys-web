// Fonction pour la synchronisation des donnu00e9es utilisateur entre instances locales et en ligne

document.addEventListener('DOMContentLoaded', function() {
    // Ajouter les u00e9lu00e9ments UI seulement si la section data-sync existe
    const syncContainer = document.getElementById('data-sync-container');
    if (!syncContainer) return;
    
    // Cru00e9ation de l'interface utilisateur pour l'exportation/importation
    syncContainer.innerHTML = `
        <div class="sync-controls">
            <h3>Synchronisation des donnu00e9es</h3>
            <p>Exportez vos donnu00e9es pour les sauvegarder ou les transfu00e9rer entre la version locale et en ligne.</p>
            
            <div class="button-group">
                <button id="export-data" class="sync-button">Exporter mes donnu00e9es</button>
                <button id="import-data" class="sync-button">Importer des donnu00e9es</button>
            </div>
            
            <input type="file" id="import-file" accept=".json" style="display: none;">
            
            <div id="sync-status" class="sync-status"></div>
        </div>
    `;
    
    // u00c9lu00e9ments DOM
    const exportButton = document.getElementById('export-data');
    const importButton = document.getElementById('import-data');
    const importFile = document.getElementById('import-file');
    const syncStatus = document.getElementById('sync-status');
    
    // Gestionnaire d'u00e9vu00e9nements
    exportButton.addEventListener('click', exportUserData);
    importButton.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importUserData);
    
    // Fonction pour exporter les donnu00e9es
    function exportUserData() {
        try {
            // Ru00e9cupu00e9rer toutes les donnu00e9es du localStorage
            const userData = {};
            
            // Clu00e9s de donnu00e9es connues dans l'application
            const dataKeys = [
                'practiceProgress',
                'exerciseStats',
                'improvisationStats',
                'musicfyTracks',
                'userSettings',
                'lastOpenedSection'
            ];
            
            // Collecter toutes les donnu00e9es existantes
            dataKeys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        userData[key] = JSON.parse(data);
                    } catch (e) {
                        userData[key] = data;
                    }
                }
            });
            
            // Ajouter les mu00e9tadonnu00e9es
            userData.meta = {
                exportDate: new Date().toISOString(),
                appVersion: '2.2',
                source: window.location.hostname || 'local'
            };
            
            // Cru00e9er le fichier JSON
            const dataStr = JSON.stringify(userData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const dataUrl = URL.createObjectURL(dataBlob);
            
            // Cru00e9er un lien de tu00e9lu00e9chargement
            const downloadLink = document.createElement('a');
            downloadLink.setAttribute('href', dataUrl);
            downloadLink.setAttribute('download', `groovy-keys-data-${new Date().toISOString().slice(0,10)}.json`);
            document.body.appendChild(downloadLink);
            
            // Tu00e9lu00e9charger le fichier
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Afficher un message de succu00e8s
            showStatus('Donnu00e9es exportu00e9es avec succu00e8s !', 'success');
        } catch (error) {
            console.error('Erreur lors de l\'exportation des donnu00e9es :', error);
            showStatus('Erreur lors de l\'exportation. Veuillez ru00e9essayer.', 'error');
        }
    }
    
    // Fonction pour importer les donnu00e9es
    function importUserData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Vu00e9rifier si les donnu00e9es sont valides
                if (!importedData || !importedData.meta) {
                    throw new Error('Format de fichier invalide');
                }
                
                // Fusionner les donnu00e9es intelligemment
                mergeUserData(importedData);
                
                // Ru00e9initialiser l'input file
                importFile.value = '';
                
                // Afficher un message de succu00e8s
                showStatus('Donnu00e9es importu00e9es et fusionnu00e9es avec succu00e8s !', 'success');
                
            } catch (error) {
                console.error('Erreur lors de l\'importation des donnu00e9es :', error);
                showStatus('Erreur lors de l\'importation. Vu00e9rifiez le format du fichier.', 'error');
            }
        };
        
        reader.readAsText(file);
    }
    
    // Fonction pour fusionner intelligemment les donnu00e9es
    function mergeUserData(importedData) {
        try {
            // Boucler sur chaque clu00e9 dans les donnu00e9es importu00e9es
            Object.keys(importedData).forEach(key => {
                // Ignorer les mu00e9tadonnu00e9es
                if (key === 'meta') return;
                
                // Ru00e9cupu00e9rer les donnu00e9es existantes pour cette clu00e9
                const existingDataStr = localStorage.getItem(key);
                let existingData = null;
                
                if (existingDataStr) {
                    try {
                        existingData = JSON.parse(existingDataStr);
                    } catch (e) {
                        existingData = existingDataStr;
                    }
                }
                
                // Du00e9terminer comment fusionner en fonction du type de donnu00e9es
                let mergedData = importedData[key];
                
                if (existingData) {
                    if (key === 'practiceProgress' || key === 'exerciseStats' || key === 'improvisationStats') {
                        // Fusionner les statistiques (prendre la valeur la plus u00e9levu00e9e ou la plus ru00e9cente)
                        mergedData = mergeStats(existingData, importedData[key]);
                    } else if (key === 'musicfyTracks') {
                        // Fusionner les listes de pistes (conserver les deux ensembles)
                        mergedData = mergeTracks(existingData, importedData[key]);
                    }
                    // Pour les autres types de donnu00e9es, on garde simplement les donnu00e9es importu00e9es (le plus ru00e9cent l'emporte)
                }
                
                // Sauvegarder les donnu00e9es fusionnu00e9es
                localStorage.setItem(key, typeof mergedData === 'string' ? mergedData : JSON.stringify(mergedData));
            });
            
            return true;
        } catch (error) {
            console.error('Erreur lors de la fusion des donnu00e9es :', error);
            return false;
        }
    }
    
    // Fonction pour fusionner les statistiques (prendre la valeur la plus u00e9levu00e9e)
    function mergeStats(existingStats, importedStats) {
        const mergedStats = { ...existingStats };
        
        // Parcourir les statistiques importu00e9es
        Object.keys(importedStats).forEach(key => {
            // Si la clu00e9 n'existe pas dans les stats existantes, l'ajouter
            if (!mergedStats[key]) {
                mergedStats[key] = importedStats[key];
                return;
            }
            
            // Sinon, prendre la valeur la plus u00e9levu00e9e
            if (typeof importedStats[key] === 'number') {
                mergedStats[key] = Math.max(mergedStats[key], importedStats[key]);
            } else if (typeof importedStats[key] === 'object') {
                // Ru00e9cursion pour les objets imbriquu00e9s
                mergedStats[key] = mergeStats(mergedStats[key], importedStats[key]);
            } else if (importedStats[key] instanceof Date || (typeof importedStats[key] === 'string' && !isNaN(Date.parse(importedStats[key])))) {
                // Pour les dates, prendre la plus ru00e9cente
                const existingDate = new Date(mergedStats[key]);
                const importedDate = new Date(importedStats[key]);
                mergedStats[key] = existingDate > importedDate ? mergedStats[key] : importedStats[key];
            }
        });
        
        return mergedStats;
    }
    
    // Fonction pour fusionner les listes de pistes (conserver les deux ensembles)
    function mergeTracks(existingTracks, importedTracks) {
        if (!Array.isArray(existingTracks) || !Array.isArray(importedTracks)) {
            return importedTracks || existingTracks;
        }
        
        // Cru00e9er un ensemble d'IDs existants pour u00e9viter les doublons
        const existingIds = new Set(existingTracks.map(track => track.id));
        
        // Ajouter uniquement les pistes qui n'existent pas du00e9ju00e0
        const newTracks = importedTracks.filter(track => !existingIds.has(track.id));
        
        // Combiner les deux listes
        const mergedTracks = [...existingTracks, ...newTracks];
        
        // Trier par date (les plus ru00e9centes d'abord)
        mergedTracks.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return dateB - dateA;
        });
        
        // Limiter u00e0 20 pistes (ou un autre nombre raisonnable)
        return mergedTracks.slice(0, 20);
    }
    
    // Fonction pour afficher un message de statut
    function showStatus(message, type) {
        syncStatus.textContent = message;
        syncStatus.className = `sync-status ${type}`;
        
        // Effacer le message apru00e8s 5 secondes
        setTimeout(() => {
            syncStatus.textContent = '';
            syncStatus.className = 'sync-status';
        }, 5000);
    }
});
