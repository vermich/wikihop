# Procédure de rollback — WikiHop

Document de référence pour les opérations de rollback en production.
À maintenir à jour après chaque release majeure.

---

## Rollback backend

### Cas nominal — rollback vers le tag précédent

```bash
# 1. Se connecter au serveur
ssh $DEPLOY_USER@$DEPLOY_HOST

# 2. Aller dans le répertoire applicatif
cd /opt/wikihop

# 3. Lister les tags disponibles pour identifier la version précédente
git tag --sort=-version:refname | head -5

# 4. Checkout du tag précédent
git checkout <previous-tag>   # ex: git checkout v1.2.3

# 5. Réinstaller les dépendances de production
cd apps/backend
npm ci --omit=dev

# 6. Rollback des migrations (si des migrations ont été appliquées)
npm run db:migrate:down       # recule d'une migration
# Répéter jusqu'à atteindre l'état cible si plusieurs migrations ont été appliquées

# 7. Restart du service
pm2 restart wikihop-backend   # ou: sudo systemctl restart wikihop

# 8. Vérifier le health check
curl https://api.wikihop.app/health
```

### Rollback migration spécifique

Le script `src/db/migrate.ts --direction down` recule d'une migration à la fois.
Consulter `apps/backend/migrations/` pour identifier les migrations appliquées.

**Attention — migrations destructives :**
Certaines migrations DROP des colonnes ou des tables. Une fois appliquées, les données sont perdues.
Avant tout rollback impliquant une migration destructive :
1. Vérifier si une sauvegarde PostgreSQL récente est disponible
2. Faire un dump manuel : `pg_dump $DATABASE_URL > /tmp/wikihop-backup-$(date +%Y%m%d-%H%M%S).sql`
3. Documenter la migration comme "rollback risqué" dans ce fichier lors de sa création

### Vérification post-rollback

```bash
# Health check API
curl https://api.wikihop.app/health
# Attendu : { "status": "ok", "db": { "status": "ok" } }

# Vérifier la version déployée dans les logs
pm2 logs wikihop-backend --lines 20
```

---

## Rollback mobile

### OTA (Over The Air) — correctifs sans changement natif

Les mises à jour OTA sont déployées via `eas update`. Un rollback OTA est possible sans intervention store.

```bash
# Lister les updates disponibles sur le channel production
eas update:list --branch production

# Rollback vers une update précédente
eas update --channel production --message "rollback to <update-id>"
# ou utiliser l'interface EAS Dashboard : https://expo.dev/accounts/[org]/projects/wikihop/updates
```

Les utilisateurs reçoivent la mise à jour OTA au prochain lancement de l'app
(comportement configuré : `checkAutomatically: ON_LOAD`).

**Éligibilité OTA (rappel) :**
- Corrections de bugs JS/TS
- Ajustements UI, textes i18n, correctifs logique métier
- Non éligibles : nouveaux modules natifs, changements SDK, modifications permissions

### Rollback store — version native

Si le bug nécessite un rollback de la version native (non-OTA) :

1. **Stopper le déploiement progressif** si disponible (Play Store : Console → Releases → Pause)
2. **iOS App Store** : Apple ne permet pas le retrait d'une version. Soumettre une nouvelle version corrective. Délai 1-3 jours (review accélérée possible via "Expedited Review").
3. **Android Play Store** : possibilité de rollback vers la version précédente depuis la Console Google Play (Production → Manage release → Rollout percentage → 0%, puis activer la version précédente).

### Vérification post-rollback mobile

- Tester le parcours complet Home → Partie → Victory sur device physique
- Vérifier que le défi quotidien fonctionne
- Contrôler les logs Expo (EAS Dashboard ou `expo diagnostics`)

---

## Communication lors d'un incident

1. Ouvrir un GitHub Issue avec le label `incident` et `release` dès le début du rollback
2. Documenter : version affectée, symptôme, action entreprise, heure de résolution
3. Post-mortem à rédiger dans `docs/ops/post-mortems/YYYY-MM-DD-[slug].md` dans les 48h

---

## Historique des releases

| Tag | Date | Notes | Statut |
|-----|------|-------|--------|
| — | — | Aucune release production à ce jour | — |
