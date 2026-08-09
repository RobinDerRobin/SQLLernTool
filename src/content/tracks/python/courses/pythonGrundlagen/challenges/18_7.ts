import type { PythonChallenge } from '../../../types';

export const challenge18_7: PythonChallenge = {
  num: '18.7',
  title: 'Attribute schützen: der doppelte Unterstrich',
  tutorial: `Python kennt keine echten "privaten" Attribute wie manche andere Sprachen — aber ein Präfix aus <b>zwei</b> Unterstrichen (<code>__saldo</code>) hat einen echten Effekt: <b>Name Mangling</b>. Python benennt das Attribut intern automatisch in <code>_Klassenname__saldo</code> um: <pre>class Konto:
    def __init__(self, saldo):
        self.__saldo = saldo
    def kontostand(self):
        return self.__saldo</pre>Von außerhalb der Klasse ist <code>konto.__saldo</code> deshalb nicht mehr erreichbar — nur der interne, umbenannte Name <code>konto._Konto__saldo</code> existiert wirklich. Der Zugriff soll bewusst nur über eine öffentliche Methode wie <code>kontostand()</code> laufen, nicht direkt am Attribut vorbei.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine Klasse <code>Konto</code> mit <code>__init__(self, saldo)</code>, die <code>saldo</code> in <code>self.__saldo</code> speichert (doppelter Unterstrich), und einer Methode <code>kontostand(self)</code>, die <code>self.__saldo</code> zurückgibt. Erzeuge <code>konto = Konto(100)</code>, speichere das Ergebnis von <code>konto.kontostand()</code> in <code>ergebnis</code> und <code>list(vars(konto).keys())</code> in <code>attribut_namen</code>. Gib beide aus.`,
  hints: [
    `<code>self.__saldo = saldo</code> in <code>__init__</code> — zwei Unterstriche vor "saldo", nicht einer.`,
    `<code>vars(konto)</code> zeigt die tatsächlichen, internen Attributnamen des Objekts — bei doppeltem Unterstrich steht dort nicht "__saldo", sondern das umbenannte "_Konto__saldo".`,
    `So sieht die Lösung aus:<pre>class Konto:
    def __init__(self, saldo):
        self.__saldo = saldo
    def kontostand(self):
        return self.__saldo

konto = Konto(100)
ergebnis = konto.kontostand()
attribut_namen = list(vars(konto).keys())
print(ergebnis, attribut_namen)</pre>`,
  ] as const,
  solution: `class Konto:
    def __init__(self, saldo):
        self.__saldo = saldo
    def kontostand(self):
        return self.__saldo

konto = Konto(100)
ergebnis = konto.kontostand()
attribut_namen = list(vars(konto).keys())
print(ergebnis, attribut_namen)`,
  syntaxExplanation: `<ul><li><code>self.__saldo</code> — doppelter Unterstrich löst Name Mangling aus.</li><li>Python speichert es intern als <code>_Konto__saldo</code>, sichtbar über <code>vars(konto)</code>.</li><li><code>kontostand()</code> ist der vorgesehene, öffentliche Zugriffsweg.</li></ul>`,
  successCriteria: `ergebnis muss 100 sein, attribut_namen muss genau ["_Konto__saldo"] sein (Beweis für das Name Mangling), beide müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnis, attribut_namen: attributNamen } = lastResult.variables;
    if (typeof ergebnis !== 'number' || !Array.isArray(attributNamen)) {
      return { ok: false, message: 'Es fehlen die Variablen "ergebnis" (Zahl) und "attribut_namen" (Liste).' };
    }
    if (ergebnis !== 100) {
      return { ok: false, message: `ergebnis ist ${ergebnis}, erwartet werden 100.` };
    }
    if (attributNamen.length !== 1 || attributNamen[0] !== '_Konto__saldo') {
      return { ok: false, message: `attribut_namen ist ${JSON.stringify(attributNamen)}, erwartet wird ["_Konto__saldo"] — wurde self.__saldo mit doppeltem Unterstrich geschrieben?` };
    }
    return { ok: true, message: 'Korrekt: self.__saldo wird durch Name Mangling zu _Konto__saldo.' };
  },
  distractors: [
    {
      code: `class Konto:
    def __init__(self, saldo):
        self._saldo = saldo
    def kontostand(self):
        return self._saldo

konto = Konto(100)
ergebnis = konto.kontostand()
attribut_namen = list(vars(konto).keys())
print(ergebnis, attribut_namen)`,
      reason: 'benutzt nur einen Unterstrich (_saldo) statt zwei (__saldo) — kontostand() liefert zwar noch korrekt 100, aber kein Name Mangling findet statt: attribut_namen ist ["_saldo"] statt des erwarteten ["_Konto__saldo"]',
    },
  ],
};
