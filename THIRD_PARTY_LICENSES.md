# Third-Party Licenses

Dieses Projekt übernimmt rohe SVG-Pfaddaten (Körperumriss + Muskelflächen)
aus einem fremden Open-Source-Projekt. Es wird keine npm-Abhängigkeit
installiert — nur die Pfaddaten wurden als eigene `.ts`-Dateien unter
`apps/web/src/assets/musclemap/` übernommen, mit eigener Rendering-Logik in
`apps/web/src/components/MuscleMap.tsx`.

## react-native-body-highlighter

- Quelle: https://github.com/HichamELBSI/react-native-body-highlighter
- Übernommener Stand: Commit `8ed39ac2ae9cb46fb79d77eedec7e5b029a75174` (2026-09-13)
- Übernommene Dateien (Original-Pfad → Ziel in diesem Projekt):
  - `assets/bodyFront.ts` → `apps/web/src/assets/musclemap/muscleFront.ts`
  - `assets/bodyBack.ts` → `apps/web/src/assets/musclemap/muscleBack.ts`
  - `assets/bodyFemaleFront.ts` → `apps/web/src/assets/musclemap/muscleFrontFemale.ts`
  - `assets/bodyFemaleBack.ts` → `apps/web/src/assets/musclemap/muscleBackFemale.ts`
  - Körperumriss-Pfade aus `components/SvgMaleWrapper.tsx` und
    `components/SvgFemaleWrapper.tsx` → `apps/web/src/assets/musclemap/bodyOutlines.ts`
- Lizenz: MIT

```
MIT License

Copyright (c) 2022 ELABBASSI Hicham

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
