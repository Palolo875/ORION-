#!/usr/bin/env node

/**
 * Script de téléchargement des modèles LLM locaux pour ORION
 * 
 * Ce script télécharge les modèles WebLLM en local pour éviter de les retélécharger
 * à chaque fois en développement.
 * 
 * Usage:
 *   npm run setup              - Télécharge tous les modèles
 *   npm run setup -- --model phi-3  - Télécharge uniquement Phi-3
 * 
 * Les modèles sont stockés dans ./models/ et servis par Vite en dev
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration des modèles à télécharger
const MODELS = [
  {
    id: 'phi-3',
    name: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
    description: 'Modèle Phi-3 Mini (recommandé)',
    baseUrl: 'https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC/resolve/main',
    files: [
      'mlc-chat-config.json',
      'ndarray-cache.json',
      // Les fichiers de poids sont très gros - on les laisse en streaming
      // 'params_shard_0.bin',
      // 'params_shard_1.bin',
    ],
    size: '2.3 GB'
  },
  {
    id: 'tinyllama',
    name: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
    description: 'Modèle TinyLlama (plus petit, plus rapide)',
    baseUrl: 'https://huggingface.co/mlc-ai/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC/resolve/main',
    files: [
      'mlc-chat-config.json',
      'ndarray-cache.json',
    ],
    size: '550 MB'
  }
];

const MODELS_DIR = path.join(__dirname, '..', 'models');

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Redirection - suivre
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`Failed to download: ${response.statusCode}`));
      }
      
      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
        process.stdout.write(`\r  Téléchargement: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(1)} MB)`);
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(''); // Nouvelle ligne après la progression
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function downloadModel(model) {
  log(`\n📦 Téléchargement: ${model.name}`, 'bright');
  log(`   Description: ${model.description}`, 'blue');
  log(`   Taille: ${model.size}`, 'yellow');
  
  const modelDir = path.join(MODELS_DIR, model.id);
  
  // Créer le dossier du modèle
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }
  
  // Télécharger chaque fichier
  for (const file of model.files) {
    const fileUrl = `${model.baseUrl}/${file}`;
    const fileDest = path.join(modelDir, file);
    
    if (fs.existsSync(fileDest)) {
      log(`  ⏭️  Fichier déjà présent: ${file}`, 'yellow');
      continue;
    }
    
    log(`  📥 Téléchargement: ${file}`, 'blue');
    
    try {
      await downloadFile(fileUrl, fileDest);
      log(`  ✅ Téléchargé: ${file}`, 'green');
    } catch (error) {
      log(`  ❌ Erreur: ${error.message}`, 'red');
      throw error;
    }
  }
  
  // Créer un fichier .info avec les métadonnées
  const infoFile = path.join(modelDir, '.model-info.json');
  fs.writeFileSync(infoFile, JSON.stringify({
    id: model.id,
    name: model.name,
    description: model.description,
    baseUrl: model.baseUrl,
    downloadedAt: new Date().toISOString(),
    note: 'Les fichiers de poids complets sont streamés depuis HuggingFace pour économiser l\'espace disque'
  }, null, 2));
  
  log(`✅ Modèle ${model.name} configuré !`, 'green');
}

async function main() {
  const args = process.argv.slice(2);
  const modelFilter = args.find(arg => arg.startsWith('--model='))?.split('=')[1];
  
  log('\n🚀 ORION - Téléchargement des Modèles Locaux\n', 'bright');
  
  // Créer le dossier models/
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    log(`📁 Dossier créé: ${MODELS_DIR}`, 'green');
  }
  
  // Filtrer les modèles si spécifié
  const modelsToDownload = modelFilter
    ? MODELS.filter(m => m.id === modelFilter)
    : MODELS;
  
  if (modelsToDownload.length === 0) {
    log(`❌ Aucun modèle trouvé avec l'ID: ${modelFilter}`, 'red');
    log(`\nModèles disponibles:`, 'yellow');
    MODELS.forEach(m => log(`  - ${m.id}: ${m.description}`, 'blue'));
    process.exit(1);
  }
  
  log(`📋 Modèles à télécharger: ${modelsToDownload.length}`, 'blue');
  
  // Important: Note sur les fichiers de poids
  log('\n💡 NOTE IMPORTANTE:', 'yellow');
  log('   Pour économiser l\'espace disque, seuls les fichiers de configuration', 'yellow');
  log('   sont téléchargés. Les fichiers de poids (2-3 GB) seront streamés depuis', 'yellow');
  log('   HuggingFace et mis en cache par le Service Worker.', 'yellow');
  log('   Cela permet d\'avoir les modèles "localement" sans occuper trop d\'espace.\n', 'yellow');
  
  // Télécharger chaque modèle
  for (const model of modelsToDownload) {
    try {
      await downloadModel(model);
    } catch (error) {
      log(`\n❌ Erreur lors du téléchargement de ${model.name}:`, 'red');
      log(`   ${error.message}`, 'red');
      log('\n💡 Conseil: Vérifiez votre connexion internet et réessayez.', 'yellow');
      process.exit(1);
    }
  }
  
  log('\n🎉 Téléchargement terminé !', 'bright');
  log('\n📖 Prochaines étapes:', 'blue');
  log('   1. Lancez le serveur de dev: npm run dev', 'reset');
  log('   2. Les modèles seront servis depuis http://localhost:8080/models/', 'reset');
  log('   3. Le cache du Service Worker conservera les fichiers de poids', 'reset');
  log('\n✨ Tests rapides avec mocks: npm test', 'green');
  log('🧠 Tests avec vrais modèles: LOAD_REAL_MODELS=true npm test', 'yellow');
  log('');
}

// Exécuter
main().catch((error) => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
