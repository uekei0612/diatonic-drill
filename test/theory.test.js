const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../theory.js");

const ALL_KEYS = ["major", "minor"].flatMap(t => T.KEYS[t].map(r => ({ t, r, id: t[0] + ":" + r })));

test("扱うキーは各 12、五度圏と ♯系→♭系 で同じ集合", () => {
  for (const t of ["major", "minor"]) {
    assert.equal(T.FIFTHS[t].length, 12);
    assert.deepEqual([...T.KEYS[t]].sort(), [...T.FIFTHS[t]].sort());
  }
});

test("♯系→♭系 の並び", () => {
  assert.deepEqual(T.KEYS.major, ["C", "G", "D", "A", "E", "B", "F#", "F", "Bb", "Eb", "Ab", "Db"]);
  assert.deepEqual(T.KEYS.minor, ["A", "E", "B", "F#", "C#", "G#", "D", "G", "C", "F", "Bb", "Eb"]);
});

test("五度圏で同じ位置のマイナーは平行調（メジャーの Ⅵ）", () => {
  T.FIFTHS.major.forEach((r, i) => {
    assert.equal(T.pc(T.spell(r, T.IV.major)[5]), T.pc(T.FIFTHS.minor[i]), `${r} と ${T.FIFTHS.minor[i]}`);
  });
});

test("全キーのスケールは 7 つの音名を 1 回ずつ使い、ダブル♯/♭ を含まない", () => {
  for (const { t, r } of ALL_KEYS) {
    const notes = T.spell(r, T.IV[t]);
    assert.equal(new Set(notes.map(n => n[0])).size, 7, `${t} ${r}: ${notes}`);
    assert.ok(notes.every(n => !/##|bb/.test(n)), `${t} ${r}: ${notes}`);
    assert.equal(notes[0], r);
  }
});

test("綴りの例", () => {
  assert.deepEqual(T.spell("E", T.IV.major), ["E", "F#", "G#", "A", "B", "C#", "D#"]);
  assert.deepEqual(T.spell("F#", T.IV.major), ["F#", "G#", "A#", "B", "C#", "D#", "E#"]);
  assert.deepEqual(T.spell("Db", T.IV.major), ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"]);
  assert.deepEqual(T.spell("Eb", T.IV.minor), ["Eb", "F", "Gb", "Ab", "Bb", "Cb", "Db"]);
});

test("調号の数", () => {
  assert.equal(T.keySig("major", "C"), 0);
  assert.equal(T.keySig("major", "F#"), 6);
  assert.equal(T.keySig("major", "Db"), -5);
  assert.equal(T.keySig("minor", "Eb"), -6);
  assert.equal(T.keySig("minor", "G#"), 5);
});

const QUALITY = {
  major: { triad: ["", "m", "m", "", "", "m", "dim"], seventh: ["M7", "m7", "m7", "M7", "7", "m7", "m7(♭5)"] },
  minor: { triad: ["m", "dim", "", "m", "m", "", ""], seventh: ["m7", "m7(♭5)", "M7", "m7", "m7", "M7", "7"] },
};
const DEG = {
  major: ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"],
  minor: ["Ⅰ", "Ⅱ", "♭Ⅲ", "Ⅳ", "Ⅴ", "♭Ⅵ", "♭Ⅶ"],
};

test("コードの型と度数表記は全キー共通", () => {
  for (const { t, r } of ALL_KEYS) for (const kind of ["triad", "seventh"]) {
    const ch = T.chordsOf(t, r, kind);
    assert.deepEqual(ch.map(c => c.q), QUALITY[t][kind], `${t} ${r} ${kind}`);
    assert.deepEqual(ch.map(c => c.deg), DEG[t].map((d, i) => d + QUALITY[t][kind][i]), `${t} ${r} ${kind}`);
  }
});

test("構成音の例", () => {
  assert.deepEqual(T.chordsOf("major", "C", "seventh")[4].tones, ["G", "B", "D", "F"]);
  assert.equal(T.chordsOf("major", "F#", "triad")[6].name, "E♯dim");
  assert.equal(T.chordsOf("minor", "A", "triad")[2].name, "C");
  assert.deepEqual(T.toneInfo("major", "C", 6, "seventh").map(x => x.lab), ["R", "♭3", "♭5", "♭7"]);
});

test("出題：どのキー・形式でも選択肢は重複せず、正解を含む", () => {
  const modes = { d2c: 4, c2d: 7, note: 4 };
  for (let n = 0; n < 50; n++) for (const k of ALL_KEYS) for (const [mode, len] of Object.entries(modes)) for (const kind of ["triad", "seventh"]) {
    const q = T.buildQuestion(k, mode, kind);
    const where = `${k.id} ${mode} ${kind}`;
    assert.equal(q.opts.length, len, where);
    assert.equal(new Set(q.opts).size, q.opts.length, `${where}: ${q.opts}`);
    assert.ok(q.opts.includes(q.ans), `${where}: ${q.ans} / ${q.opts}`);
    if (mode === "note") assert.ok(q.i >= 1 && q.i <= 6, where);
  }
});
