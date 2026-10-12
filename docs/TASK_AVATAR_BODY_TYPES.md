# Anleitung: 3D-Avatare mit unterschiedlichen Körpertypen

## Warum

Die aktuellen 3D-Avatare (`apps/web/src/components/ExerciseAvatar3D.tsx`) zeigen jede Übung mit genau einer Standard-Figur. Idee: zusätzliche Varianten (z. B. ältere Person, größerer Körperbau) anbieten, damit sich mehr Patienten in der Demonstration wiederfinden — ohne dass die App das automatisch aus Patientendaten ableitet (siehe „Wichtiges Prinzip" unten).

## Der Code ist bereits vorbereitet

`ExerciseAvatar3D.tsx` unterstützt strukturell mehrere Körpertyp-Varianten pro Übung:

```ts
type BodyType = 'standard' | 'senior' | 'plus-size';

variants: { standard: '/avatars/push-up.fbx' }
// später ergänzbar um:
variants: { standard: '/avatars/push-up.fbx', senior: '/avatars/push-up-senior.fbx' }
```

Sobald eine Übung mehr als eine Variante hat, erscheint automatisch eine Auswahl-Leiste in der 3D-Ansicht. Fehlt eine Variante für eine Übung, wird `standard` als Fallback genutzt. **Es muss nichts am Code geändert werden** — nur die FBX-Datei ablegen und einen Eintrag in `EXERCISES` in `ExerciseAvatar3D.tsx` ergänzen.

## Werkzeuge (Stand: August 2026, geprüft)

Die klassische MakeHuman-Standalone-App ist veraltet und wird faktisch nicht mehr gepflegt (15 Jahre alte 3D-Engine, offizielle Aussage: "bug fixes and updates should generally not be expected"). Das Projekt selbst empfiehlt stattdessen **MPFB** (MakeHuman Plugin For Blender) — kostenlos, aktiv gepflegt.

Alternative zu Mixamo, falls das Probleme macht: **[AccuRIG](https://www.reallusion.com/accurig/)** (Reallusion, kostenlos, aktiv gepflegt, Desktop-Tool, FBX-Export).

## Schritt-für-Schritt-Anleitung

### Teil 1 — Blender + MPFB installieren

1. **[Blender](https://www.blender.org/)** herunterladen und installieren — mindestens Version 4.2.0 (Mindestanforderung für MPFB2).
2. Blender öffnen → **Edit → Preferences → Get Extensions** (bzw. "Add-ons", je nach Version).
3. Im Suchfeld **"MPFB"** eingeben, auf **"Install"** klicken.
4. Nach der Installation: im 3D-Viewport das N-Menü öffnen (Taste `N`) — dort erscheint ein neuer Reiter **"MPFB"**.
5. Zusätzlich das **"MakeHuman System Assets"-Paket** herunterladen (verlinkt auf der [MPFB-Downloadseite](https://static.makehumancommunity.org/mpfb/downloads.html)) — enthält Haut, Augen, Zähne.
6. Im MPFB-Tab: **"Apply assets" → "Library settings" → "Load pack from zip file"**, ZIP auswählen, danach **Blender neu starten**.

### Teil 2 — Figur erstellen und Körpertyp einstellen

7. Im MPFB-Tab: **"New human" → "From scratch"**, optional Geschlecht/Ethnie im Dropdown wählen, dann **"Create"** klicken.
8. Zum Modellieren: MPFB-Tab → Reiter **"Modeling"** → Abschnitt **"Macrodetail"**. Dort liegen die großen Regler (u. a. Alter, Gewicht, Muskulatur).
9. Mit gedrückter linker Maustaste in einem Regler ziehen, um die Figur live zu verändern (z. B. Richtung "alt" bzw. "höheres Gewicht"). Änderungen sind sofort sichtbar.

### Teil 3 — Für den Export vorbereiten

10. MPFB-Tab → **"Operations" → "Basemesh"** → **"Bake shapekeys"**, danach **"Delete helpers"**.
11. Maskierungs-Modifier prüfen/entfernen, falls Mixamo damit Probleme macht.
12. Material auf **"GameEngine"** stellen (bessere Kompatibilität).

### Teil 4 — Als FBX exportieren

13. Alles im Viewport abwählen.
14. Figur im Outliner rechtsklicken → **"Select Hierarchy"**.
15. **File → Export → FBX**.
16. Im Dialog: **"Path Mode" auf "Copy"**, Häkchen bei **"Embed Textures"**, **"Selected Objects"** aktivieren.
17. Exportieren (z. B. als `figur-aelter.fbx`).

### Teil 5 — Bei Mixamo rigen und Animation übertragen

18. Auf **[mixamo.com](https://www.mixamo.com/)** mit kostenlosem Adobe-Account einloggen.
19. **"Upload Character"**, FBX auswählen ("Embed Media" aktivieren, falls abgefragt).
20. Marker der Reihe nach auf **Kinn, Handgelenke, Ellbogen, Knie, Leiste** setzen (bei asymmetrischen Figuren beide Seiten einzeln prüfen).
21. Bestätigen → Auto-Rigging läuft (ein paar Minuten).
22. **"Find Animations"** klicken, dieselbe Animation suchen, die der jeweilige bestehende Avatar nutzt (z. B. "Squat", "Push Up", "Jogging"), auf die neu gerigte Figur anwenden.

### Teil 6 — Herunterladen

23. **"Download"** klicken.
24. Einstellungen: **Format: FBX Binary**, **Skin: With Skin**, **Frames per Second: 30**, Keyframe-Reduktion: **None** (identisch zur Vorgabe im Fehlertext von `CanvasErrorBoundary` in `ExerciseAvatar3D.tsx`).
25. Datei herunterladen.

### Teil 7 — Ins Projekt einbinden

26. Datei ablegen, z. B. `apps/web/public/avatars/kniebeuge-senior.fbx`.
27. In `ExerciseAvatar3D.tsx` bei der passenden Übung den `variants`-Eintrag ergänzen:
    ```ts
    variants: { standard: '/avatars/push-up.fbx', senior: '/avatars/push-up-senior.fbx' }
    ```
28. Fertig — kein weiterer Code nötig, die Auswahl-Leiste erscheint automatisch in der App.

## Wichtiges Prinzip

Die Auswahl der Körpertyp-Variante ist **immer eine bewusste, manuelle Handlung** der Person, die die 3D-Ansicht öffnet — niemals eine automatische Ableitung aus Alter, Gewicht oder anderen Patientenmerkmalen. Das spiegelt dieselbe Regel wider, die für die Übungs-Anpassungen gilt (siehe `TASK_ADAPTATIONS.md` / `AdaptationPicker.tsx`): keine automatische Zuweisung anhand von Patientendaten.

## Offene Punkte / nicht Teil dieser Anleitung

- Keine der 3 bestehenden Übungen hat aktuell mehr als die `standard`-Variante — die eigentlichen FBX-Dateien für weitere Körpertypen müssen erst erstellt werden (manuelle Arbeit in Blender/Mixamo, siehe oben).
- Lizenzfragen bei ggf. zugekauften Zusatz-Assets (z. B. MPFB-Asset-Packs) vor Produktivbetrieb prüfen.
