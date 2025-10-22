# 🤝 Guide de Contribution ORION

Merci de votre intérêt pour contribuer à ORION ! Ce guide vous aidera à démarrer.

## 📋 Table des matières

- [Code de Conduite](#code-de-conduite)
- [Comment contribuer](#comment-contribuer)
- [Processus de développement](#processus-de-développement)
- [Standards de code](#standards-de-code)
- [Soumettre une Pull Request](#soumettre-une-pull-request)
- [Signaler un bug](#signaler-un-bug)
- [Proposer une fonctionnalité](#proposer-une-fonctionnalité)

## 📜 Code de Conduite

En participant à ce projet, vous acceptez de respecter notre code de conduite :

- Soyez respectueux et professionnel
- Acceptez les critiques constructives
- Concentrez-vous sur ce qui est meilleur pour la communauté
- Faites preuve d'empathie envers les autres contributeurs

## 🚀 Comment contribuer

Il existe plusieurs façons de contribuer à ORION :

1. **Signaler des bugs** - Aidez-nous à identifier et corriger les problèmes
2. **Proposer des fonctionnalités** - Partagez vos idées pour améliorer ORION
3. **Améliorer la documentation** - Clarifiez ou étoffez nos guides
4. **Soumettre du code** - Corrigez des bugs ou implémentez de nouvelles fonctionnalités
5. **Réviser les PR** - Aidez à réviser les contributions des autres

## 🛠️ Processus de développement

### 1. Fork et Clone

```bash
# Forker le repo sur GitHub, puis cloner votre fork
git clone https://github.com/votre-username/orion.git
cd orion

# Ajouter le repo upstream
git remote add upstream https://github.com/org-orion/orion.git
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Créer une branche

```bash
# Créer une branche pour votre fonctionnalité ou correction
git checkout -b feature/ma-nouvelle-fonctionnalite
# ou
git checkout -b fix/correction-du-bug
```

### 4. Développer

```bash
# Lancer le serveur de développement
npm run dev

# Lancer les tests en mode watch
npm run test:watch
```

### 5. Tester

```bash
# Exécuter tous les tests
npm run test

# Vérifier le coverage
npm run test:coverage

# Lancer les tests E2E
npm run test:e2e

# Linter
npm run lint
```

### 6. Committer

Suivez la convention Conventional Commits :

```bash
git commit -m "feat: ajouter la fonctionnalité X"
git commit -m "fix: corriger le bug Y"
git commit -m "docs: mettre à jour le README"
git commit -m "test: ajouter des tests pour Z"
git commit -m "refactor: améliorer la structure de W"
git commit -m "chore: mettre à jour les dépendances"
```

Types de commits :
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation
- `style`: Formatage, point-virgules manquants, etc.
- `refactor`: Refactoring de code
- `test`: Ajout ou correction de tests
- `chore`: Maintenance, dépendances, configuration

## 📏 Standards de code

### TypeScript

- Utilisez TypeScript strict mode
- Évitez `any`, préférez des types spécifiques ou `unknown`
- Documentez les types complexes avec des commentaires JSDoc
- Utilisez les types utilitaires TypeScript (Pick, Omit, Partial, etc.)

### React

- Utilisez des composants fonctionnels avec hooks
- Préférez la composition à l'héritage
- Gardez les composants petits et focalisés (< 200 lignes)
- Utilisez des hooks personnalisés pour la logique réutilisable
- Nommez les props de manière descriptive

### Style et formatage

```bash
# Le code est automatiquement formatté par ESLint
npm run lint
```

- Indentation: 2 espaces
- Longueur de ligne: 120 caractères max
- Pas de point-virgules (configuré par ESLint)
- Quotes simples pour les strings
- Trailing commas dans les objets et arrays

### Tests

- Écrivez des tests pour toute nouvelle fonctionnalité
- Maintenez un coverage > 80%
- Nommez les tests clairement : `should [comportement] when [condition]`
- Utilisez les mocks pour les dépendances externes
- Un test = un concept

### Sécurité

- Jamais de `eval()` ou `Function()` constructors
- Toujours valider et sanitiser les inputs utilisateur
- Utilisez DOMPurify pour le HTML
- Vérifiez les permissions avant d'accéder aux APIs du navigateur

## 📤 Soumettre une Pull Request

1. **Synchroniser avec upstream**

```bash
git fetch upstream
git rebase upstream/main
```

2. **Pousser votre branche**

```bash
git push origin feature/ma-nouvelle-fonctionnalite
```

3. **Créer la PR sur GitHub**

- Titre clair et descriptif
- Description détaillée des changements
- Référencer les issues liées (ex: "Fixes #123")
- Ajouter des screenshots si UI changes
- Cocher les checkboxes de la PR template

4. **Review process**

- Répondez aux commentaires de review
- Faites les modifications demandées
- Demandez une re-review après les changements
- Les PR doivent être approuvées par au moins 1 maintainer

5. **Merge**

- Les PR sont squash merged vers main
- Le titre de la PR devient le message de commit
- La branche est automatiquement supprimée après merge

## 🐛 Signaler un bug

Utilisez le template d'issue "Bug Report" et incluez :

- **Description claire** du bug
- **Steps to reproduce** - Étapes pour reproduire
- **Expected behavior** - Comportement attendu
- **Actual behavior** - Comportement actuel
- **Screenshots** si pertinent
- **Environment** - OS, navigateur, version Node.js
- **Console logs** - Logs d'erreur pertinents

## 💡 Proposer une fonctionnalité

Utilisez le template d'issue "Feature Request" et incluez :

- **Problème résolu** - Quel problème cette fonctionnalité résout-elle ?
- **Solution proposée** - Comment envisagez-vous la solution ?
- **Alternatives** - Avez-vous considéré d'autres approches ?
- **Impact** - Qui bénéficiera de cette fonctionnalité ?

## ✅ Checklist avant de soumettre

- [ ] Les tests passent (`npm run test`)
- [ ] Le linter ne signale aucune erreur (`npm run lint`)
- [ ] Le code est documenté (JSDoc pour les fonctions publiques)
- [ ] Les nouveaux fichiers ont les copyright headers appropriés
- [ ] La documentation est mise à jour si nécessaire
- [ ] Les messages de commit suivent la convention
- [ ] La PR est liée à une issue existante

## 📞 Besoin d'aide ?

- 💬 [Discussions GitHub](https://github.com/org-orion/orion/discussions)
- 🐛 [Issues](https://github.com/org-orion/orion/issues)
- 📧 Email: contribute@orion.dev

## 🙏 Merci !

Chaque contribution, petite ou grande, rend ORION meilleur. Merci de faire partie de cette communauté ! 🚀

---

*Ce guide de contribution est inspiré des meilleures pratiques open source.*
