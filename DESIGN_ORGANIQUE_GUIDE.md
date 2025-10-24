# Guide du Design "Organique & Intuitif" - ORION v2.01

## 🎨 Philosophie de Design

Le design "Organique & Intuitif" d'ORION v2.01 suit trois principes directeurs :

### Principe n°1 : Simple en Surface, Riche en Profondeur
L'interface est immédiatement utilisable par un novice, sans friction. La complexité et la puissance sont accessibles via des interactions intentionnelles (clic sur les paramètres, ouverture d'un menu avancé), jamais imposées.

### Principe n°2 : Douceur et Réactivité
Chaque interaction (clic, survol, transition) est accompagnée d'une micro-animation douce et naturelle. L'interface semble vivante et répond de manière fluide, sans jamais être brusque.

### Principe n°3 : Clarté et Sérénité
La palette de couleurs, la typographie et l'espacement créent un environnement calme, concentré et agréable à utiliser sur de longues périodes.

## 🎨 Palette de Couleurs

### Mode Clair
- **Arrière-plan principal** : Couleur Lin (#FAF0E6) - `hsl(30, 45%, 96%)`
- **Texte principal** : Gris Ardoise (#36454F) - `hsl(200, 15%, 28%)`
- **Accent primaire** : Vert Sauge (#B2AC88) - `hsl(70, 15%, 60%)`
- **Accent secondaire** : Rose Poudré (#E6C7C2) - `hsl(10, 40%, 87%)`

### Couleurs Pastel Complémentaires
- **Violet doux** : `hsl(270, 55%, 85%)`
- **Lavande** : `hsl(260, 45%, 88%)`
- **Vert menthe** : `hsl(150, 35%, 88%)`
- **Pêche** : `hsl(25, 70%, 88%)`
- **Bleu ciel** : `hsl(200, 55%, 88%)`

### Mode Sombre
Le mode sombre utilise des teintes plus sombres et désaturées des mêmes couleurs, créant une ambiance élégante et reposante pour les yeux.

## ✍️ Typographie

### Titres (Serif)
- **Police** : 'Lora', Georgia, serif
- **Usage** : Titres principaux (h1, h2), message d'accueil
- **Style** : Élégant et éditorial, donne un aspect raffiné

### Corps de texte (Sans-Serif)
- **Police** : 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif
- **Usage** : Tout le reste de l'interface
- **Style** : Moderne, très lisible, optimal pour une utilisation prolongée

## 🎭 Effets Visuels

### Effet Glass (Verre Liquide)
```css
.glass {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(colors, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}
```

### Effet Flottant
```css
.floating-panel {
  box-shadow: 
    0 20px 60px -10px rgba(0, 0, 0, 0.08),
    0 8px 24px -8px rgba(primary, 0.1);
  border-radius: 1.5rem;
}
```

### Animations Douces
- **Durée** : 300-500ms
- **Easing** : `cubic-bezier(0.4, 0, 0.2, 1)`
- **Types** : fade-in, slide-up, scale-in, float-gentle

## 📱 Composants Clés

### 1. Message d'Accueil Dynamique
Le message change selon l'heure :
- **Matin (5h-12h)** : "Bonjour 🌅"
- **Après-midi (12h-18h)** : "Bon après-midi ☀️"
- **Soir (18h-22h)** : "Bonsoir 🌆"
- **Nuit (22h-5h)** : "Bonne soirée 🌙"

### 2. Zone de Saisie Organique
- Coins très arrondis (`rounded-[2rem]`)
- Effet glass avec ombre portée
- Gradient subtil de fond
- Boutons avec micro-interactions

### 3. Sidebar Flottante
- Détachée du bord avec marges (`top-4 left-4 bottom-4`)
- Effet flottant avec ombres élégantes
- Rétractable avec animation douce
- Stats et recherche intégrées

### 4. Panneau de Contrôle Modal
- Fenêtre flottante au centre
- Backdrop avec blur
- Navigation par onglets
- Sections organisées et claires

### 5. Suggestions en Pilules
- Forme arrondie (`rounded-[2rem]`)
- Gradient de fond selon la catégorie
- Animation au survol
- Icônes colorées

## 🎯 Micro-Interactions

### Au Survol (Hover)
```css
.smooth-interaction:hover {
  transform: translateY(-2px);
  box-shadow: enhanced;
}
```

### Au Clic (Active)
```css
.smooth-interaction:active {
  transform: translateY(0);
}
```

### Transitions
Toutes les transitions utilisent `cubic-bezier(0.4, 0, 0.2, 1)` pour un mouvement naturel.

## 📐 Espacements & Rayons

### Rayons de Bordure
- **Extra large** : `2rem` (32px) - Zone de saisie, conteneurs principaux
- **Large** : `1.5rem` (24px) - Panneaux, modales
- **Moyen** : `1.25rem` (20px) - Boutons, cartes
- **Petit** : `1rem` (16px) - Éléments secondaires

### Espacements
- Utilisation du système Tailwind (4px increments)
- Padding généreux pour la respiration visuelle
- Gap consistent pour l'alignement

## 📱 Responsive & Mobile-First

### Points de rupture
- **Mobile** : < 640px
- **Tablet** : 640px - 1024px
- **Desktop** : > 1024px

### Adaptations Mobile
- Sidebar en plein écran avec backdrop
- Boutons plus grands pour le toucher
- Texte adaptatif
- Navigation simplifiée

## 🌈 Animations Spéciales

### Float Gentle
```css
@keyframes float-gentle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```

### Glow Pulse
```css
@keyframes glow-pulse {
  0%, 100% { opacity: 0.6; filter: blur(20px); }
  50% { opacity: 0.8; filter: blur(30px); }
}
```

## ♿ Accessibilité

- Contrastes de couleurs conformes WCAG AA
- Aria-labels sur tous les boutons interactifs
- Navigation au clavier supportée
- Animations respectent `prefers-reduced-motion`
- Focus visible et distinctif

## 🎨 Utilisation des Classes

### Classes Principales
```tsx
// Glass effect
<div className="glass" />

// Glass avec hover
<div className="glass glass-hover" />

// Effet flottant
<div className="floating-panel" />

// Interactions douces
<button className="smooth-interaction" />

// Animations
<div className="animate-fade-in" />
<div className="animate-slide-up" />
<div className="animate-float-gentle" />
```

## 📝 Bonnes Pratiques

1. **Toujours utiliser des coins arrondis** : Minimum `rounded-lg`, préférer `rounded-[1.25rem]` ou plus
2. **Ajouter des transitions** : Utiliser `smooth-interaction` pour la cohérence
3. **Respecter la hiérarchie** : Titres en Serif (Lora), corps en Sans-Serif (Manrope)
4. **Utiliser les gradients** : Pour les accents et les backgrounds subtils
5. **Espacements généreux** : Laisser respirer le contenu
6. **Animations douces** : Toujours avec easing naturel

## 🚀 Évolution Future

Le design organique est conçu pour évoluer :
- Nouvelles couleurs pastel peuvent être ajoutées
- Animations peuvent être enrichies
- Nouveaux patterns d'interaction
- Tout en maintenant la cohérence et la philosophie de base

---

**Design créé pour ORION v2.01** - Une interface qui respire la douceur et l'élégance naturelle.
