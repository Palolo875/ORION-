# 🚀 Guide de Déploiement ORION

## Déploiement Rapide (5 minutes)

### Option 1: Netlify (Recommandé)

#### Via Interface Web
1. Créer un compte sur [Netlify](https://netlify.com)
2. Cliquer sur "Add new site" > "Import an existing project"
3. Connecter votre repo GitHub
4. Configuration :
   ```
   Build command: npm run build
   Publish directory: dist
   ```
5. Cliquer sur "Deploy"

#### Via CLI
```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Se connecter
netlify login

# Déployer
netlify deploy --prod --dir=dist
```

**✅ Temps de déploiement : ~2 minutes**

---

### Option 2: Vercel

#### Via Interface Web
1. Créer un compte sur [Vercel](https://vercel.com)
2. Cliquer sur "New Project"
3. Importer votre repo GitHub
4. Configuration auto-détectée (Vite)
5. Cliquer sur "Deploy"

#### Via CLI
```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel --prod
```

**✅ Temps de déploiement : ~3 minutes**

---

### Option 3: Cloudflare Pages

#### Via Interface Web
1. Créer un compte sur [Cloudflare Pages](https://pages.cloudflare.com)
2. Cliquer sur "Create a project"
3. Connecter votre repo GitHub
4. Configuration :
   ```
   Build command: npm run build
   Build output directory: dist
   ```
5. Cliquer sur "Save and Deploy"

#### Via CLI
```bash
# Installer Wrangler
npm install -g wrangler

# Se connecter
wrangler login

# Déployer
wrangler pages deploy dist
```

**✅ Temps de déploiement : ~2 minutes**

---

### Option 4: GitHub Pages

#### Configuration
1. Créer `.github/workflows/deploy.yml` :
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

2. Activer GitHub Pages dans Settings > Pages
3. Source : "gh-pages branch"

**✅ Déploiement automatique à chaque push**

---

### Option 5: Serveur Custom (VPS, Docker)

#### Avec Docker
1. Créer `Dockerfile` :
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. Créer `nginx.conf` :
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;
        
        # Headers de sécurité
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # Support PWA et SPA
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Cache des assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

3. Build et Run :
```bash
docker build -t orion-app .
docker run -d -p 80:80 orion-app
```

#### Sans Docker (Nginx direct)
```bash
# Build
npm run build

# Copier vers Nginx
sudo cp -r dist/* /var/www/html/

# Configurer Nginx
sudo nano /etc/nginx/sites-available/orion

# Contenu (même que ci-dessus)
# Puis :
sudo ln -s /etc/nginx/sites-available/orion /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**✅ Application accessible sur votre domaine**

---

## Configuration Post-Déploiement

### 1. Headers de Sécurité (Production)

Ajouter dans votre configuration (Netlify, Vercel, etc.) :

**netlify.toml** (déjà configuré) :
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```

**vercel.json** :
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

### 2. Domaine Custom

#### Netlify/Vercel/Cloudflare
1. Aller dans Settings > Domain
2. Ajouter votre domaine
3. Configurer les DNS selon les instructions

#### Recommandation : 
- `app.votredomaine.com` ou `orion.votredomaine.com`

### 3. SSL/HTTPS

✅ **Automatique** avec Netlify/Vercel/Cloudflare (Let's Encrypt)

Pour un serveur custom :
```bash
# Certbot (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votredomaine.com
```

---

## Monitoring et Analytics

### Option 1: Plausible Analytics (Privacy-first)
```html
<!-- Dans index.html -->
<script defer data-domain="yourdomain.com" 
  src="https://plausible.io/js/script.js"></script>
```

### Option 2: Google Analytics 4
```javascript
// Dans main.tsx
import ReactGA from 'react-ga4';
ReactGA.initialize('G-XXXXXXXXXX');
```

### Option 3: Self-hosted (Umami)
```bash
docker run -d \
  --name umami \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  ghcr.io/umami-software/umami:postgresql-latest
```

---

## Performance Optimization

### 1. CDN Configuration

**Cloudflare** :
- Cache Level: Standard
- Browser Cache TTL: 1 year
- Auto Minify: JS, CSS, HTML

**Netlify** :
- Asset Optimization: Enabled (par défaut)
- Bundle CSS: Enabled

### 2. Compression

Déjà activé par défaut sur toutes les plateformes :
- Brotli (meilleur que gzip)
- Gzip (fallback)

### 3. Edge Caching

```
Cache-Control headers (déjà configurés) :
- index.html : no-cache
- JS/CSS : max-age=31536000 (1 an)
- Images : max-age=31536000
```

---

## Vérification Post-Déploiement

### Checklist
- [ ] Site accessible via HTTPS
- [ ] PWA installable (icône + dans la barre d'URL)
- [ ] Service Worker actif (DevTools > Application)
- [ ] Modèles se chargent correctement
- [ ] Conversations sauvegardées
- [ ] Export/Import fonctionne
- [ ] Thème clair/sombre fonctionne
- [ ] Responsive sur mobile

### Tests de Performance
1. [Google PageSpeed Insights](https://pagespeed.web.dev/)
2. [WebPageTest](https://www.webpagetest.org/)
3. Lighthouse (DevTools > Lighthouse)

**Scores attendus :**
- Performance : 85+
- Accessibilité : 95+
- Best Practices : 90+
- SEO : 95+
- PWA : 100

---

## Backup et Maintenance

### Backup Automatique des Données Utilisateur

Les données sont stockées localement (IndexedDB), mais vous pouvez proposer un export automatique :

```javascript
// Ajouter dans ControlPanel.tsx
const handleAutoBackup = () => {
  setInterval(() => {
    // Export automatique toutes les 24h
    handleExportMemory();
  }, 24 * 60 * 60 * 1000);
};
```

### Mise à Jour du Code

#### Déploiement Continu (CI/CD)
Toutes les plateformes détectent automatiquement les nouveaux commits et redéploient.

#### Version Manuelle
```bash
# 1. Tester localement
npm run build
npm run preview

# 2. Tagger la version
git tag v1.0.0
git push --tags

# 3. Déployer
# (selon votre plateforme)
```

---

## Troubleshooting

### Site ne se charge pas
1. Vérifier les logs de build
2. Vérifier la configuration du dossier de build (`dist`)
3. Tester localement : `npm run preview`

### Erreur CORS
- Les modèles sont chargés depuis Hugging Face
- Aucune configuration CORS nécessaire
- Tout est côté client

### Service Worker ne s'installe pas
1. Vérifier HTTPS (requis pour SW)
2. Vérifier dans DevTools > Application > Service Workers
3. Clear cache et reload

### Performance lente
1. Vérifier le CDN est actif
2. Vérifier la compression Brotli/gzip
3. Utiliser un modèle plus léger pour appareils faibles

---

## Support et Communauté

### Resources
- 📚 [Documentation complète](./README.md)
- 🐛 [Issues GitHub](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)

### Contact
Pour toute question sur le déploiement, créer une issue GitHub.

---

## 🎉 Félicitations !

Votre application ORION est maintenant en production !

**URL publique** : `https://votre-domaine.com`

**Prochaines étapes** :
1. Partager le lien avec vos utilisateurs
2. Monitorer les performances
3. Collecter les retours utilisateurs
4. Itérer et améliorer

---

*Développé avec ❤️ pour la communauté open-source*
