# Guide Visuel - Sélecteur de Modèle LLM ORION

## 🎯 Aperçu Rapide

Le sélecteur de modèle LLM est maintenant accessible depuis **3 endroits** dans l'interface ORION :

```
┌─────────────────────────────────────────────────────────────┐
│  ORION    [Standard (Rec.)]  [micro]  [🧠] [☀️] [🧠] [⚙️]  │
│  ↑                            ↑              ↑         ↑      │
│  Logo                         Device         Brain    Settings│
│                               Profile        Flow              │
└─────────────────────────────────────────────────────────────┘
```

## 📍 Emplacements d'Accès

### 1. 🎛️ Panneau de Paramètres (Principal)

**Comment y accéder :**
- Cliquer sur l'icône ⚙️ (Settings) en haut à droite
- Sélectionner l'onglet "IA"
- Section "Modèle d'IA Local"

**Ce que vous voyez :**
```
┌─────────────────────────────────────────────────────┐
│  Modèle d'IA Local                        RAM: 8GB  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌───────────────────────────────────────────┐     │
│  │  Démo Rapide                          ✓   │     │
│  │  Modèle léger pour découvrir...           │     │
│  │  [550 MB] [2048 tokens] [⭐] [⚡⚡⚡]       │     │
│  └───────────────────────────────────────────┘     │
│                                                      │
│  ┌───────────────────────────────────────────┐     │
│  │  Standard (Recommandé)           ✨ Optimal│     │
│  │  Modèle recommandé avec le meilleur...    │     │
│  │  [2 GB] [4096 tokens] [⭐⭐] [⚡⚡]          │     │
│  └───────────────────────────────────────────┘     │
│                                                      │
│  ┌───────────────────────────────────────────┐     │
│  │  Avancé                                    │     │
│  │  Performances maximales pour...            │     │
│  │  [1.9 GB] [8192 tokens] [⭐⭐⭐] [⚡]       │     │
│  └───────────────────────────────────────────┘     │
│                                                      │
│  ┌───────────────────────────────────────────┐     │
│  │  Mistral 7B                                │     │
│  │  Modèle puissant pour...                   │     │
│  │  [4.5 GB] [8192 tokens] [⭐⭐⭐⭐] [⚡]      │     │
│  │  ⚠️ RAM insuffisante (min. 8GB)           │     │
│  └───────────────────────────────────────────┘     │
│                                                      │
│  💡 Tous les modèles fonctionnent 100% localement  │
└─────────────────────────────────────────────────────┘
```

**Fonctionnalités :**
- ✅ Vue détaillée de tous les modèles
- ✅ Indicateurs de compatibilité
- ✅ Badges recommandé/optimal
- ✅ Détection automatique RAM/GPU
- ✅ Modèles incompatibles grisés

---

### 2. ⚡ Menu Rapide (Dropdown)

**Comment y accéder :**
- Cliquer sur le bouton avec icône 🧠 (Brain) dans l'en-tête
- Visible sur écrans moyens et grands (md+)

**Ce que vous voyez :**
```
┌──────────────────────────────────────┐
│  🧠  Changer de modèle              │
├──────────────────────────────────────┤
│  Démo Rapide                         │
│  550 MB • 2048 tokens • ⭐          │
├──────────────────────────────────────┤
│  Standard (Recommandé)         Rec. ✓│
│  2 GB • 4096 tokens • ⭐⭐           │
├──────────────────────────────────────┤
│  Avancé                              │
│  1.9 GB • 8192 tokens • ⭐⭐⭐       │
├──────────────────────────────────────┤
│  Mistral 7B                          │
│  4.5 GB • 8192 tokens • ⭐⭐⭐⭐     │
├──────────────────────────────────────┤
│  Gemma 2B                            │
│  1.5 GB • 8192 tokens • ⭐⭐         │
├──────────────────────────────────────┤
│  CodeGemma 2B                        │
│  1.6 GB • 8192 tokens • ⭐⭐         │
└──────────────────────────────────────┘
```

**Fonctionnalités :**
- ✅ Accès ultra-rapide
- ✅ Vue compacte
- ✅ Check mark sur modèle actuel
- ✅ Changement en un clic

---

### 3. 📌 Badge Modèle (En-tête)

**Comment y accéder :**
- Cliquer sur le badge du nom du modèle actuel
- Visible dans l'en-tête : `[Standard (Rec.)]`

**Ce qui se passe :**
- Ouvre le panneau de paramètres
- Navigation automatique vers l'onglet IA

---

## 🎨 Indicateurs Visuels

### Qualité du Modèle
```
⭐         = Basic       (Qualité de base)
⭐⭐       = High        (Bonne qualité)
⭐⭐⭐     = Very High   (Très bonne qualité)
⭐⭐⭐⭐   = Ultra       (Qualité maximale)
```

### Vitesse d'Inférence
```
⚡⚡⚡     = Very Fast   (Très rapide)
⚡⚡       = Fast        (Rapide)
⚡         = Moderate    (Modéré)
🐌        = Slow        (Lent)
```

### Badges Spéciaux
```
✨ Recommandé  = Modèle recommandé par défaut
🎯 Optimal     = Meilleur modèle pour votre appareil
✓ Sélectionné  = Modèle actuellement actif
```

### Statuts de Compatibilité
```
✅ Actif       = Cliquable et sélectionnable
⚠️ Incompatible = RAM insuffisante
🔒 Grisé       = Non sélectionnable
```

---

## 📊 Tableau Comparatif des Modèles

| Modèle | Taille | RAM Min | Contexte | Qualité | Vitesse | Usage Recommandé |
|--------|--------|---------|----------|---------|---------|------------------|
| **Démo Rapide** | 550 MB | 2 GB | 2K | ⭐ | ⚡⚡⚡ | Tests rapides, démo |
| **Standard** ⭐ | 2 GB | 4 GB | 4K | ⭐⭐ | ⚡⚡ | Usage quotidien |
| **Avancé** | 1.9 GB | 6 GB | 8K | ⭐⭐⭐ | ⚡ | Tâches complexes |
| **Mistral 7B** | 4.5 GB | 8 GB | 8K | ⭐⭐⭐⭐ | ⚡ | Analyses avancées |
| **Gemma 2B** | 1.5 GB | 4 GB | 8K | ⭐⭐ | ⚡⚡ | Efficace et rapide |
| **CodeGemma 2B** | 1.6 GB | 4 GB | 8K | ⭐⭐ | ⚡⚡ | Programmation |

---

## 🔄 Flux de Changement de Modèle

```
┌─────────────────────────────────────────────────────────┐
│  1. UTILISATEUR                                          │
│     └─→ Clique sur un nouveau modèle                   │
│                                                           │
│  2. VALIDATION                                           │
│     ├─→ Vérification RAM disponible                    │
│     └─→ Vérification compatibilité                     │
│                                                           │
│  3. SÉLECTION                                            │
│     ├─→ Mise à jour UI (check mark)                    │
│     ├─→ Sauvegarde localStorage                        │
│     └─→ Callback onModelChange()                       │
│                                                           │
│  4. CHARGEMENT                                           │
│     ├─→ Worker LLM notifié                             │
│     ├─→ Téléchargement si nécessaire                   │
│     ├─→ Barre de progression affichée                  │
│     └─→ Cache activé                                    │
│                                                           │
│  5. ACTIVATION                                           │
│     ├─→ Modèle chargé en mémoire                       │
│     ├─→ UI mise à jour (badge + dropdown)              │
│     └─→ ✅ Prêt à l'utilisation                         │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Conseils d'Utilisation

### Quel Modèle Choisir ?

#### 🏃 Pour Tester Rapidement
```
Choisissez : Démo Rapide (TinyLlama)
- Charge en quelques secondes
- Répond instantanément
- Parfait pour découvrir ORION
```

#### 💼 Pour un Usage Quotidien
```
Choisissez : Standard (Phi-3 Mini) ⭐
- Équilibre qualité/vitesse optimal
- Recommandé par défaut
- Convient à 90% des usages
```

#### 🚀 Pour des Tâches Complexes
```
Choisissez : Avancé (Llama 3.2)
- Meilleure compréhension
- Contexte plus long (8K tokens)
- Raisonnement avancé
```

#### 👨‍💻 Pour la Programmation
```
Choisissez : CodeGemma 2B
- Spécialisé code
- Génération précise
- Débogage efficace
```

#### 🎯 Pour Performances Maximales
```
Choisissez : Mistral 7B
- Qualité ultra (4 étoiles)
- Analyses approfondies
- Nécessite 8GB RAM
```

---

## 🎭 Scénarios d'Usage

### Scénario 1 : Premier Démarrage
```
1. ORION détecte : 6 GB RAM, WebGPU disponible
2. Système recommande : "Standard" (optimal)
3. Badge affiché : "Standard (Rec.) [Optimal]"
4. Utilisateur peut choisir autre modèle si souhaité
```

### Scénario 2 : Appareil Limité
```
1. ORION détecte : 3 GB RAM, pas de GPU
2. Système recommande : "Démo Rapide"
3. Modèles grisés : Avancé, Mistral
4. Message : "⚠️ RAM insuffisante"
```

### Scénario 3 : Changement Dynamique
```
1. Utilisateur passe de "Standard" à "Avancé"
2. Confirmation visuelle (check mark)
3. Chargement progressif (2-5 secondes)
4. Nouveau modèle actif
5. Toutes les requêtes suivantes utilisent le nouveau modèle
```

---

## 🛠️ Personnalisation Avancée

### Pour les Power Users

Le système stocke la préférence dans `localStorage` :
```javascript
// Clé : orion_selected_model
// Valeur : ID du modèle (ex: "Phi-3-mini-4k-instruct-q4f16_1-MLC")
```

Vous pouvez :
- Exporter/importer les configurations
- Comparer les performances entre modèles
- Mesurer les temps d'inférence
- Consulter les métriques dans le Control Panel

---

## 📱 Responsive Design

### 🖥️ Desktop (> 1024px)
```
[ORION] [Badge Modèle] [Device] [🧠 Dropdown] [☀️] [🧠] [⚙️]
        ↑ Cliquable      ↑ Visible  ↑ Visible
```

### 📱 Tablet (768px - 1024px)
```
[ORION] [Badge] [Device] [🧠] [☀️] [🧠] [⚙️]
        ↑ Cliquable      ↑ Visible
```

### 📱 Mobile (< 768px)
```
[☰] [ORION] [Device]        [☀️] [🧠] [⚙️]
     ↑ Badge intégré dans titre
     Accès via Settings uniquement
```

---

## ✅ Checklist Utilisateur

### Premier Usage
- [ ] Ouvrir ORION
- [ ] Vérifier le badge du modèle affiché
- [ ] Ouvrir les Paramètres (⚙️) → Onglet "IA"
- [ ] Consulter les modèles compatibles
- [ ] Choisir le modèle optimal recommandé
- [ ] Confirmer la sélection
- [ ] Attendre le chargement

### Changement de Modèle
- [ ] Cliquer sur 🧠 Dropdown ou Badge ou ⚙️ Settings
- [ ] Sélectionner le nouveau modèle
- [ ] Vérifier la compatibilité (pas grisé)
- [ ] Confirmer le changement
- [ ] Patienter pendant le chargement
- [ ] Vérifier que le badge est mis à jour

### Optimisation Performance
- [ ] Ouvrir Control Panel (⚙️) → Performance
- [ ] Consulter les métriques
- [ ] Si latence élevée : modèle plus léger
- [ ] Si qualité insuffisante : modèle plus puissant
- [ ] Tester différents modèles
- [ ] Garder celui qui convient

---

## 🎯 Résumé Visuel

```
╔══════════════════════════════════════════════════════╗
║         SÉLECTEUR DE MODÈLE LLM ORION               ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  📍 3 Emplacements d'Accès                          ║
║     • Panneau Paramètres (complet)                  ║
║     • Menu Rapide Dropdown (rapide)                 ║
║     • Badge En-tête (direct)                        ║
║                                                      ║
║  🎯 6 Modèles Disponibles                           ║
║     • Démo Rapide (550 MB)                          ║
║     • Standard (2 GB) ⭐                             ║
║     • Avancé (1.9 GB)                               ║
║     • Mistral 7B (4.5 GB)                           ║
║     • Gemma 2B (1.5 GB)                             ║
║     • CodeGemma 2B (1.6 GB)                         ║
║                                                      ║
║  ✨ Fonctionnalités                                 ║
║     • Détection automatique capacités               ║
║     • Recommandations intelligentes                 ║
║     • Validation compatibilité                      ║
║     • Changement dynamique                          ║
║     • Persistance localStorage                      ║
║                                                      ║
║  🎨 Interface                                        ║
║     • Design moderne glass morphism                 ║
║     • Animations fluides                            ║
║     • Responsive (mobile/desktop)                   ║
║     • Mode clair/sombre                             ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---

**🎉 Le sélecteur de modèle LLM ORION est maintenant opérationnel !**

Profitez de la flexibilité totale pour choisir le modèle qui correspond le mieux à vos besoins et à votre appareil. 🚀
