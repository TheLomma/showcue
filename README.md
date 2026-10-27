# Showcue 2.0.0

Musik- und Effektsteuerung fuer Zaubershows. Laeuft im Browser. Lokale Musik bleibt auf dem Geraet.

## Funktionen (Version 2.0.0)
- Cue-Liste mit lokalen Musikdateien und YouTube-Links
- GO, Pause/Weiter, Stille, NOT-STOPP (Esc)
- Ein-/Ausblenden, Lautstaerke, Schleifenmodus pro Cue
- Abschnitte, Stichwort-Skript, Sprungmarken pro Titel
- Positionsleiste und Spulen (-15/-5/+5/+15 s, J/L)
- Ansage-Modus (Ducking), visuelles Signal bei Cue-Start
- Zeitplan mit Ziel-Laufzeit, Timer, Effekte (Applaus, Trommelwirbel, Glocke)
- Fernbedienung ueber Tasten und Medientasten, frei belegbar
- Ansichten: Show, Uebersicht, Bearbeiten, Einstellungen
- Optiken: Buehne, Hell, Neon
- Setup exportieren und importieren (JSON)
- Vorhoeren ohne Publikum (Musikdateien)

## Starten und bauen
Die Befehle stehen in package.json: dev (Entwicklungsserver), build (Produktionsversion), preview (Vorschau der Produktionsversion). Den Paketmanager deiner Wahl verwenden und die Abhaengigkeiten einmalig installieren lassen.

## Auf GitHub hochladen
1. Auf github.com ein neues, leeres Repository anlegen, z. B. showcue.
2. Im Projektordner diese Git-Befehle ausfuehren:

    git init
    git add .
    git commit -m "Showcue 2.0.0"
    git branch -M main
    git remote add origin https://github.com/DEIN-NAME/showcue.git
    git push -u origin main

## Auf Vercel veroeffentlichen
1. Bei vercel.com mit GitHub anmelden und "Add New Project" waehlen.
2. Das Repository showcue auswaehlen.
3. Vercel erkennt Vite automatisch. Build-Befehl: der Build-Befehl aus package.json, Ausgabeordner: dist.
4. "Deploy" klicken. Danach gibt es eine oeffentliche Adresse.

## Hinweise
- YouTube-Wiedergabe funktioniert nur ueber eine echte Internetadresse, nicht in reinen Vorschau-Fenstern.
- Bluetooth-Fernbedienungen haengen vom Geraet ab. Vor dem Auftritt testen.
- Musikdateien werden beim Setup-Import nicht gespeichert und muessen neu zugeordnet werden.
