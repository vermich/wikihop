# Spec technique — P-13 : Textes légaux in-app (CGU simplifiées)

**Story :** `docs/stories/phase-4/P-13-legal-texts.md`
**Destinataire :** Laurent (Frontend Dev)
**Branche :** `feat/laurent-P13-legal-texts`
**PR cible :** `develop`

---

## Contexte

L'écran `AboutScreen` contient une section "Légal" avec un seul lien ("Politique de confidentialité"). La story P-13 exige d'ajouter un second lien "Mentions légales" dans cette section, conformément aux exigences légales de mise en production (Phase 4).

Cette spec couvre uniquement la partie frontend visible de P-13 : ajout du `LinkRow` et des clés i18n dans les 8 locales.

---

## Périmètre

**Dans scope :**
- Modification de `apps/mobile/src/screens/AboutScreen.tsx` : ajout d'un `LinkRow`
- Ajout de 2 clés i18n (`legal_mentions_label`, `legal_mentions_a11y`) dans les 8 fichiers de locale

**Hors scope :**
- Création ou hébergement de la page `https://wikihop.app/mentions-legales` (hors app mobile)
- Modification du composant `LinkRow` ou de `SectionHeader`
- Toute autre section de `AboutScreen`

---

## Architecture proposée

### Aucun nouveau composant

`LinkRow` et `SectionHeader` sont déjà définis comme composants internes dans `AboutScreen.tsx`. Aucun nouveau fichier n'est requis.

### Emplacement exact de l'insertion dans AboutScreen.tsx

La section "Légal" actuelle (lignes 157–163) est :

```tsx
{/* Section Légal */}
<SectionHeader title={t('about.section_legal')} />
<LinkRow
  label={t('about.legal_privacy_label')}
  url="https://wikihop.app/privacy"
  accessibilityLabel={t('about.legal_privacy_a11y')}
/>

<View style={styles.separator} />
```

Après modification, la section doit être :

```tsx
{/* Section Légal */}
<SectionHeader title={t('about.section_legal')} />
<LinkRow
  label={t('about.legal_privacy_label')}
  url="https://wikihop.app/privacy"
  accessibilityLabel={t('about.legal_privacy_a11y')}
/>
<LinkRow
  label={t('about.legal_mentions_label')}
  url="https://wikihop.app/mentions-legales"
  accessibilityLabel={t('about.legal_mentions_a11y')}
/>

<View style={styles.separator} />
```

Le nouveau `LinkRow` s'insère **directement après** le `LinkRow` "Politique de confidentialité" et **avant** le `<View style={styles.separator} />`. Aucune modification du style `linkRow` n'est nécessaire — il gère déjà le `minHeight: 44` et la séparation visuelle.

---

## Clés i18n à ajouter — 8 locales

Les 2 clés `legal_mentions_label` et `legal_mentions_a11y` s'ajoutent dans la section `"about"` de chaque fichier, **après `"legal_privacy_a11y"`** et **avant `"code_github_label"`**.

### `fr.json`
```json
"legal_mentions_label": "Mentions légales",
"legal_mentions_a11y": "Consulter les mentions légales de WikiHop"
```

### `en.json`
```json
"legal_mentions_label": "Legal notices",
"legal_mentions_a11y": "View WikiHop's legal notices"
```

### `es.json`
```json
"legal_mentions_label": "Aviso legal",
"legal_mentions_a11y": "Consultar el aviso legal de WikiHop"
```

### `de.json`
```json
"legal_mentions_label": "Impressum",
"legal_mentions_a11y": "Impressum von WikiHop anzeigen"
```

### `pt.json`
```json
"legal_mentions_label": "Aviso legal",
"legal_mentions_a11y": "Consultar o aviso legal do WikiHop"
```

### `it.json`
```json
"legal_mentions_label": "Note legali",
"legal_mentions_a11y": "Consulta le note legali di WikiHop"
```

### `nl.json`
```json
"legal_mentions_label": "Juridische informatie",
"legal_mentions_a11y": "Juridische informatie van WikiHop bekijken"
```

### `pl.json`
```json
"legal_mentions_label": "Informacje prawne",
"legal_mentions_a11y": "Zobacz informacje prawne WikiHop"
```

---

## TDD — fonctions pures et hooks à tester

Cette modification est purement déclarative (ajout JSX + clés JSON). Il n'y a **aucune fonction pure ni hook** à introduire.

Pas de tests à écrire au sens TDD strict. Les critères de qualité suffisent.

---

## Critères de qualité (code review)

- [ ] `tsc --noEmit` passe sans erreur
- [ ] `npm run lint` passe sans erreur
- [ ] Le lien "Mentions légales" est présent dans la section Légal de `AboutScreen`, après "Politique de confidentialité"
- [ ] Le lien "Politique de confidentialité" est toujours présent et non modifié (non-régression)
- [ ] Les 2 clés `legal_mentions_label` et `legal_mentions_a11y` sont présentes dans les **8** fichiers de locale
- [ ] Aucune clé existante n'est supprimée ou déplacée dans les fichiers JSON
- [ ] La structure JSON des 8 fichiers reste valide (pas de virgule manquante ou en trop)
- [ ] Zéro `any`, zéro import inutilisé

---

## Points de vigilance

**Virgules JSON :** les fichiers de locale utilisent des virgules de fin sur chaque entrée sauf la dernière de la section. Lors de l'insertion de `legal_mentions_a11y` avant `code_github_label`, la ligne `legal_mentions_a11y` doit porter une virgule de fin. Ne pas en ajouter une à l'ancienne dernière entrée `legal_privacy_a11y` — elle en possède déjà une puisqu'elle n'était pas la dernière de la section `about` (les clés `code_github_*` la suivaient déjà).

**Ordre des clés JSON :** respecter le bloc logique existant : `legal_privacy_label` → `legal_privacy_a11y` → `legal_mentions_label` → `legal_mentions_a11y` → `code_github_label` → `code_github_a11y`.

**URL en dur :** l'URL `https://wikihop.app/mentions-legales` est passée directement en prop, comme `https://wikihop.app/privacy` l'est déjà. Pas de constante externe à créer pour cette spec.

**Pas de séparateur visuel entre les deux liens** : les deux `LinkRow` de la section Légal sont adjacents, sans `<View style={styles.separator} />` entre eux — le style `linkRow` existant (`minHeight: 44`, `paddingVertical: 4`) assure la lisibilité.
