const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../theory.js");

const ALL_KEYS = ["major", "minor"].flatMap(t => T.KEYS[t].map(r => ({ t, r, id: t + ":" + r })));

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
    assert.ok(
      notes.every(n => !/##|bb/.test(n)),
      `${t} ${r}: ${notes}`,
    );
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
  for (const { t, r } of ALL_KEYS)
    for (const kind of ["triad", "seventh"]) {
      const ch = T.chordsOf(t, r, kind);
      assert.deepEqual(
        ch.map(c => c.q),
        QUALITY[t][kind],
        `${t} ${r} ${kind}`,
      );
      assert.deepEqual(
        ch.map(c => c.deg),
        DEG[t].map((d, i) => d + QUALITY[t][kind][i]),
        `${t} ${r} ${kind}`,
      );
    }
});

test("構成音の例", () => {
  assert.deepEqual(T.chordsOf("major", "C", "seventh")[4].tones, ["G", "B", "D", "F"]);
  assert.equal(T.chordsOf("major", "F#", "triad")[6].name, "E♯dim");
  assert.equal(T.chordsOf("minor", "A", "triad")[2].name, "C");
  assert.deepEqual(
    T.toneInfo("major", "C", 6, "seventh").map(x => x.lab),
    ["R", "♭3", "♭5", "♭7"],
  );
});

test("出題：どのキー・形式でも選択肢は重複せず、正解を含む", () => {
  const modes = { d2c: 4, c2d: 7, note: 4 };
  for (let n = 0; n < 50; n++)
    for (const k of ALL_KEYS)
      for (const [mode, len] of Object.entries(modes))
        for (const kind of ["triad", "seventh"]) {
          const q = T.buildQuestion(k, mode, kind);
          const where = `${k.id} ${mode} ${kind}`;
          assert.equal(q.opts.length, len, where);
          assert.equal(new Set(q.opts).size, q.opts.length, `${where}: ${q.opts}`);
          assert.ok(q.opts.includes(q.ans), `${where}: ${q.ans} / ${q.opts}`);
          if (mode === "note") assert.ok(q.i >= 1 && q.i <= 6, where);
        }
});

test("マイナーの Ⅴ・Ⅶ をハーモニックから借りると、その 2 つだけ変わる", () => {
  for (const r of T.KEYS.minor)
    for (const kind of ["triad", "seventh"]) {
      const nat = T.chordsOf("minor", r, kind),
        dom = T.chordsOf("minor", r, kind, true);
      const want = kind === "triad" ? ["", "dim"] : ["7", "dim7"];
      assert.deepEqual([dom[4].q, dom[6].q], want, `${r}m ${kind}`);
      assert.deepEqual([dom[4].deg, dom[6].deg], ["Ⅴ" + want[0], "Ⅶ" + want[1]], `${r}m ${kind}`);
      for (const i of [0, 1, 2, 3, 5]) assert.deepEqual(dom[i], nat[i], `${r}m ${kind} ${i}`);
      assert.equal(T.pc(dom[6].root), (T.pc(r) + 11) % 12, `${r}m の Ⅶ は導音`);
    }
  assert.equal(T.chordsOf("major", "C", "seventh", true)[4].name, "G7", "メジャーキーには効かない");
});

test("借りた Ⅴ・Ⅶ の構成音", () => {
  const am = T.chordsOf("minor", "A", "seventh", true);
  assert.deepEqual(am[4].tones, ["E", "G♯", "B", "D"]);
  assert.deepEqual(am[6].tones, ["G♯", "B", "D", "F"]);
  assert.deepEqual(
    T.toneInfo("minor", "A", 6, "seventh", true).map(x => x.lab),
    ["R", "♭3", "♭5", "♭♭7"],
  );
  assert.equal(T.chordsOf("minor", "G#", "triad", true)[6].name, "F♯♯dim", "G♯m の導音は F𝄪");
  assert.equal(T.chordsOf("minor", "Eb", "seventh", true)[4].name, "B♭7");
});

test("出題：借りた Ⅴ・Ⅶ でも選択肢は重複せず、正解を含む", () => {
  const minors = T.KEYS.minor.map(r => ({ t: "minor", r, id: "minor:" + r }));
  for (let n = 0; n < 50; n++)
    for (const k of minors)
      for (const mode of ["d2c", "c2d", "note"])
        for (const kind of ["triad", "seventh"]) {
          const q = T.buildQuestion(k, mode, kind, true);
          assert.equal(new Set(q.opts).size, q.opts.length, `${k.id} ${mode}: ${q.opts}`);
          assert.ok(q.opts.includes(q.ans), `${k.id} ${mode}: ${q.ans} / ${q.opts}`);
        }
});
