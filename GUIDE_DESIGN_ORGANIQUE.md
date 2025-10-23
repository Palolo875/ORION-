# Guide du Design Organique ORION

## 🎨 Philosophie du Design

Le nouveau design d'ORION repose sur trois principes fondamentaux :

1. **Organicité** : Formes arrondies et fluides qui évoquent la nature
2. **Pastel** : Couleurs douces et apaisantes pour une expérience relaxante
3. **Clarté** : Interface épurée qui met le contenu en avant

## 🌈 Palette de Couleurs

### Couleurs Principales

```css
/* Couleurs Pastel */
--pastel-linen: 30 45% 92%;      /* Lin - Tons chauds */
--pastel-feather: 210 20% 95%;   /* Plume - Tons aériens */
--pastel-violet: 270 60% 85%;    /* Violet pastel */
--pastel-rose: 340 75% 90%;      /* Rose doux */
--pastel-lavender: 260 50% 88%;  /* Lavande apaisante */
--pastel-mint: 150 40% 90%;      /* Menthe fraîche */
--pastel-peach: 20 80% 90%;      /* Pêche chaleureuse */
--pastel-sky: 200 60% 88%;       /* Ciel bleu */
```

### Usage Thématique

| Usage | Couleurs | Exemple |
|-------|----------|---------|
| Navigation | Violet + Rose | Boutons actifs |
| Information | Sky + Feather | Sections informatives |
| Action | Mint + Sky | Boutons d'action |
| Alerte | Peach + Rose | Avertissements |
| Neutre | Linen + Feather | Arrière-plans |

## 🎯 Composants Réutilisables

### 1. Bouton Organique

```tsx
// Bouton primaire
<Button className="
  rounded-2xl
  bg-gradient-to-br from-primary to-accent
  hover:scale-105
  transition-all duration-200
  shadow-lg
  h-10 px-6
">
  Action
</Button>

// Bouton secondaire avec pastel
<Button className="
  rounded-2xl
  bg-gradient-to-br
  from-[hsl(var(--pastel-violet))]/20
  to-[hsl(var(--pastel-rose))]/10
  hover:scale-105
  border border-primary/20
">
  Action Secondaire
</Button>
```

### 2. Carte Organique

```tsx
<div className="
  rounded-3xl
  bg-gradient-to-br
  from-[hsl(var(--pastel-sky))]/30
  to-[hsl(var(--pastel-feather))]/20
  p-6
  border border-border/30
  hover:border-primary/30
  transition-all
  hover:shadow-lg
">
  <h3 className="text-lg font-semibold mb-3">Titre</h3>
  <p className="text-muted-foreground">Contenu</p>
</div>
```

### 3. Pilule de Suggestion

```tsx
<button className="
  flex items-center gap-2
  px-5 py-3
  rounded-full
  bg-gradient-to-br
  from-[hsl(var(--pastel-mint))]/30
  to-[hsl(var(--pastel-sky))]/20
  border-2 border-transparent
  hover:border-primary/30
  hover:scale-105
  active:scale-95
  transition-all duration-200
  shadow-md hover:shadow-lg
">
  <div className="p-2 rounded-full bg-white/50">
    <Icon className="h-4 w-4 text-green-600" />
  </div>
  <span className="font-medium">Label</span>
</button>
```

### 4. Input Organique

```tsx
<div className="
  glass
  rounded-[2rem]
  p-4
  bg-gradient-to-br
  from-[hsl(var(--pastel-feather))]/20
  to-white/50
  border-2 border-[hsl(var(--glass-border))]
  focus-within:border-primary/30
  transition-all
">
  <input
    className="
      w-full
      bg-transparent
      border-0
      focus:outline-none
    "
    placeholder="Saisissez votre texte..."
  />
</div>
```

### 5. Badge Thématique

```tsx
<Badge className="
  px-3 py-1
  rounded-full
  bg-gradient-to-r
  from-[hsl(var(--pastel-violet))]/20
  to-[hsl(var(--pastel-rose))]/20
  text-primary
  border border-primary/20
  font-medium
">
  Premium
</Badge>
```

## 🎨 Gradients Pré-définis

### Navigation
```css
.gradient-nav {
  background: linear-gradient(
    to right,
    hsl(var(--pastel-violet) / 0.15),
    hsl(var(--pastel-rose) / 0.15)
  );
}
```

### Information
```css
.gradient-info {
  background: linear-gradient(
    to bottom right,
    hsl(var(--pastel-sky) / 0.3),
    hsl(var(--pastel-feather) / 0.2)
  );
}
```

### Action
```css
.gradient-action {
  background: linear-gradient(
    to bottom right,
    hsl(var(--pastel-mint) / 0.3),
    hsl(var(--pastel-sky) / 0.2)
  );
}
```

### Highlight
```css
.gradient-highlight {
  background: linear-gradient(
    to bottom right,
    hsl(var(--pastel-peach) / 0.3),
    hsl(var(--pastel-rose) / 0.2)
  );
}
```

## 📐 Système d'Espacement

### Padding Standard

```css
.organic-padding-sm: p-4    /* Petits éléments */
.organic-padding-md: p-5    /* Éléments moyens */
.organic-padding-lg: p-6    /* Grands éléments */
.organic-padding-xl: p-8    /* Très grands éléments */
```

### Gaps Standard

```css
gap-2   /* Entre petits éléments (0.5rem) */
gap-3   /* Entre éléments moyens (0.75rem) */
gap-4   /* Entre grands éléments (1rem) */
```

## 🔘 Rayons de Bordure

### Échelle de Rondeur

```css
/* Ultra-arrondi (pilules, boutons) */
rounded-full

/* Très arrondi (grandes cartes, modals) */
rounded-[2.5rem]  /* 40px */

/* Arrondi (cartes moyennes) */
rounded-[2rem]    /* 32px */

/* Moyennement arrondi (petites cartes, boutons) */
rounded-2xl       /* 16px */

/* Légèrement arrondi (éléments compacts) */
rounded-xl        /* 12px */
```

### Guide d'Utilisation

| Élément | Border Radius | Exemple |
|---------|---------------|---------|
| Modals | `rounded-[2.5rem]` | Panneau de paramètres |
| Grandes cartes | `rounded-3xl` | Sections du WelcomeScreen |
| Cartes moyennes | `rounded-[2rem]` | Barre de saisie |
| Boutons | `rounded-2xl` | Tous les boutons |
| Badges | `rounded-full` | Labels et tags |
| Icônes containers | `rounded-full` ou `rounded-2xl` | Icônes dans les suggestions |

## 🌊 Effets de Mouvement

### Hover Effects

```tsx
// Scale subtil
className="hover:scale-105 transition-all duration-200"

// Scale avec rotation légère
className="hover:scale-105 hover:rotate-1 transition-all duration-200"

// Scale pour les petits éléments
className="hover:scale-110 transition-all duration-200"

// Scale pour les grands conteneurs
className="hover:scale-[1.01] transition-all duration-300"
```

### Active Effects

```tsx
// Press effect
className="active:scale-95 transition-all duration-100"

// Press avec feedback visuel
className="active:scale-95 active:opacity-80 transition-all"
```

### Focus Effects

```tsx
// Focus ring organique
className="
  focus:outline-none
  focus:ring-2
  focus:ring-primary/30
  focus:ring-offset-2
  transition-all
"
```

## 🎭 États Visuels

### État Normal
```tsx
className="
  bg-gradient-to-br
  from-[hsl(var(--pastel-feather))]/30
  to-white/50
"
```

### État Hover
```tsx
className="
  hover:from-[hsl(var(--pastel-violet))]/20
  hover:to-[hsl(var(--pastel-rose))]/10
  hover:border-primary/30
  hover:shadow-lg
"
```

### État Actif
```tsx
className="
  bg-gradient-to-r
  from-primary/15
  to-accent/15
  border-2 border-primary/20
  shadow-md
"
```

### État Désactivé
```tsx
className="
  opacity-50
  cursor-not-allowed
  hover:scale-100
"
```

## 📱 Responsivité

### Breakpoints

```tsx
// Mobile first
className="text-sm sm:text-base"

// Padding responsive
className="p-4 sm:p-6 lg:p-8"

// Grid responsive
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

// Visibility conditionnelle
className="hidden sm:block"
className="sm:hidden"
```

### Layout Adaptatif

```tsx
// Flex direction responsive
className="flex flex-col sm:flex-row"

// Gap responsive
className="gap-2 sm:gap-3 lg:gap-4"

// Border radius responsive
className="rounded-[2rem] sm:rounded-[2.5rem]"
```

## 🎯 Bonnes Pratiques

### DO ✅

1. **Toujours** utiliser des gradients pastel pour les fonds
2. **Toujours** arrondir les coins (minimum `rounded-xl`)
3. **Toujours** ajouter des transitions (`transition-all`)
4. **Toujours** utiliser des hover effects subtils
5. **Toujours** respecter la hiérarchie visuelle

### DON'T ❌

1. **Jamais** utiliser des coins carrés (`rounded-none`)
2. **Jamais** mélanger trop de couleurs pastel dans un même élément
3. **Jamais** oublier les états hover/active
4. **Jamais** utiliser des transitions trop lentes (> 300ms)
5. **Jamais** négliger la version mobile

## 🎨 Exemples Complets

### Section de Paramètres

```tsx
<div className="space-y-6 animate-fade-in">
  {/* Header */}
  <div className="space-y-2">
    <h3 className="text-2xl font-semibold flex items-center gap-3">
      <div className="p-2 rounded-xl bg-[hsl(var(--pastel-sky))]/30">
        <Brain className="h-6 w-6 text-blue-600" />
      </div>
      Configuration de l'IA
    </h3>
    <p className="text-sm text-muted-foreground pl-14">
      Personnalisez le comportement de l'assistant IA.
    </p>
  </div>

  <Separator className="my-6" />

  {/* Contenu */}
  <div className="space-y-4 p-5 rounded-3xl bg-gradient-to-br from-[hsl(var(--pastel-peach))]/20 to-[hsl(var(--pastel-rose))]/10">
    {/* Vos contrôles ici */}
  </div>
</div>
```

### Menu de Navigation Vertical

```tsx
<nav className="flex-1 space-y-2">
  {items.map((item) => (
    <button
      key={item.id}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        isActive
          ? "bg-gradient-to-r from-primary/15 to-accent/15 text-primary shadow-md border border-primary/20"
          : "hover:bg-[hsl(var(--pastel-feather))]/40 text-muted-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
      <span className="font-medium">{item.label}</span>
      {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
    </button>
  ))}
</nav>
```

## 📚 Ressources

### Outils Utiles

- **Générateur de Gradients** : https://cssgradient.io/
- **Convertisseur HSL** : https://hslpicker.com/
- **Palettes Pastel** : https://coolors.co/
- **Border Radius Visualizer** : https://9elements.github.io/fancy-border-radius/

### Inspirations

- Manus UI Pattern Library
- ChatGPT Settings Panel
- Linear Design System
- Stripe UI Components

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2025-10-23  
**Auteur** : Équipe ORION
