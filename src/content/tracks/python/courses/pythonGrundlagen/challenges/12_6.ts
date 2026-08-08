import type { PythonChallenge } from '../../../types';

export const challenge12_6: PythonChallenge = {
  num: '12.6',
  title: 'Beliebig viele Argumente: *args und **kwargs',
  tutorial: `Manchmal weiß man beim Schreiben einer Funktion noch nicht, wie viele Argumente sie später bekommen soll. Mit <code>*args</code> nimmt eine Funktion beliebig viele <b>positionelle</b> Argumente entgegen und sammelt sie als Tupel: <pre>def summe(*zahlen):
    return sum(zahlen)

summe(1, 2, 3)      # zahlen ist (1, 2, 3) -&gt; 6
summe(5, 10)        # zahlen ist (5, 10)   -&gt; 15</pre>Mit <code>**kwargs</code> (zwei Sternchen) sammelt eine Funktion beliebig viele <b>benannte</b> Argumente als Dictionary: <pre>def profil(**angaben):
    return angaben

profil(name="Ana", alter=30)   # angaben ist {"name": "Ana", "alter": 30}</pre>Beide lassen sich in derselben Funktion kombinieren — <code>*args</code> immer vor <code>**kwargs</code>: <code>def f(*args, **kwargs): ...</code>. Der Stern selbst ist entscheidend: <code>*artikel</code> sammelt, ein Parameter ohne Stern nimmt nur genau ein Argument entgegen.`,
  task: `Ein Warenkorb soll beliebig viele Artikel entgegennehmen (unbekannt wie viele) und zusätzlich optionale, benannte Zusatzwünsche wie eine Geschenkverpackung.<br><br><b>Deine Aufgabe:</b> Schreibe eine Funktion <code>bestellung(*artikel, **extras)</code>. Sie soll ein Tupel <code>(anzahl, geschenk)</code> zurückgeben, wobei <code>anzahl</code> die Anzahl der übergebenen Artikel ist (<code>len(artikel)</code>) und <code>geschenk</code> der Wert von <code>extras.get("geschenkverpackung", False)</code>. Rufe die Funktion mit den drei Artikeln <code>"Buch"</code>, <code>"Stift"</code>, <code>"Heft"</code> und dem Zusatzwunsch <code>geschenkverpackung=True</code> auf. Speichere die beiden Rückgabewerte in <code>anzahl</code> und <code>geschenk</code> und gib beide aus.`,
  hints: [
    `<code>*artikel</code> im Funktionskopf sammelt alle positionellen Argumente als Tupel — <code>len(artikel)</code> zählt sie.`,
    `<code>**extras</code> sammelt alle benannten Argumente als Dictionary — <code>extras.get("geschenkverpackung", False)</code> liest den Wert sicher aus, auch falls er fehlt.`,
    `So sieht die Lösung aus:<pre>def bestellung(*artikel, **extras):
    anzahl = len(artikel)
    geschenk = extras.get("geschenkverpackung", False)
    return anzahl, geschenk

anzahl, geschenk = bestellung("Buch", "Stift", "Heft", geschenkverpackung=True)
print(anzahl, geschenk)</pre>`,
  ] as const,
  solution: `def bestellung(*artikel, **extras):
    anzahl = len(artikel)
    geschenk = extras.get("geschenkverpackung", False)
    return anzahl, geschenk

anzahl, geschenk = bestellung("Buch", "Stift", "Heft", geschenkverpackung=True)
print(anzahl, geschenk)`,
  syntaxExplanation: `<ul><li><code>*artikel</code> — sammelt beliebig viele positionelle Argumente als Tupel.</li><li><code>**extras</code> — sammelt beliebig viele benannte Argumente als Dictionary.</li><li><code>extras.get("geschenkverpackung", False)</code> — liest einen Dictionary-Wert mit Standardwert, statt mit <code>[...]</code> einen KeyError zu riskieren.</li></ul>`,
  successCriteria: `anzahl muss 3 sein, geschenk muss True sein, beide müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { anzahl, geschenk } = lastResult.variables;
    if (typeof anzahl !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "anzahl".' };
    }
    if (anzahl !== 3) {
      return { ok: false, message: `anzahl ist ${anzahl}, erwartet werden 3 Artikel.` };
    }
    if (typeof geschenk !== 'boolean' || geschenk !== true) {
      return { ok: false, message: 'geschenk muss True sein (geschenkverpackung wurde angefragt).' };
    }
    if (!lastResult.stdout.includes('3') || !lastResult.stdout.includes('True')) {
      return { ok: false, message: 'anzahl und geschenk müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: 3 Artikel, Geschenkverpackung gewünscht.' };
  },
  distractors: [
    {
      code: `def bestellung(*artikel, extras):
    anzahl = len(artikel)
    geschenk = extras.get("geschenkverpackung", False)
    return anzahl, geschenk

anzahl, geschenk = bestellung("Buch", "Stift", "Heft", geschenkverpackung=True)
print(anzahl, geschenk)`,
      reason: 'vergisst den doppelten Stern vor extras — dadurch ist extras nur ein einzelner Parameter namens "extras", und der Aufruf mit geschenkverpackung=True schlägt mit "unexpected keyword argument" fehl',
    },
  ],
};
