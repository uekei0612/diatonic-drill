/* 音楽理論の計算と出題の組み立て。DOM には触らない。
   ブラウザでは通常の <script> として読み込み（file:// でも動くよう ES module にはしない）、
   Node ではテストから require() する。 */
const LET = "CDEFGAB",
  LPC = [0, 2, 4, 5, 7, 9, 11];
/* minor はナチュラルマイナー。harmonic は Ⅴ・Ⅶ のコードを借りるためだけに使う（第7音を半音上げた形） */
const IV = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11] };
const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"];
const NDEG = { major: ["R", "2", "3", "4", "5", "6", "7"], minor: ["R", "2", "♭3", "4", "5", "♭6", "♭7"] };
/* 主音からの半音数 → 度数の表記（NDEG と同じ書き方） */
const DEG_OF = { 0: "R", 2: "2", 3: "♭3", 4: "3", 5: "4", 7: "5", 8: "♭6", 9: "6", 10: "♭7", 11: "7" };
/* 扱うキーはこの五度圏の並びが正本。同じ位置のメジャーとマイナーは平行調（F♯ と E♭m は異名同音で揃えている） */
const FIFTHS = {
  major: ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"],
  minor: ["A", "E", "B", "F#", "C#", "G#", "Eb", "Bb", "F", "C", "G", "D"],
};
const QT = { triad: ["", "m", "dim"], seventh: ["M7", "7", "m7", "m7(♭5)", "dim7"] };

const parse = n => ({ l: LET.indexOf(n[0]), a: [...n.slice(1)].reduce((s, c) => s + (c === "#" ? 1 : -1), 0) });
const accStr = d => (d > 0 ? "#".repeat(d) : "b".repeat(-d));
const pc = n => {
  const p = parse(n);
  return (((LPC[p.l] + p.a) % 12) + 12) % 12;
};
const fmt = n => n[0] + n.slice(1).replace(/#/g, "♯").replace(/b/g, "♭");
const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function spell(root, ivs) {
  const r = parse(root),
    rp = pc(root);
  return ivs.map((iv, i) => {
    const l = (r.l + i) % 7;
    let d = (((((rp + iv) % 12) - LPC[l]) % 12) + 12) % 12;
    if (d > 6) d -= 12;
    return LET[l] + accStr(d);
  });
}
/* ivs のスケールの各音をルートにした三和音／四和音 */
function chordsFrom(ivs, root, kind) {
  const notes = spell(root, ivs);
  return notes.map((n, i) => {
    const a = ivs[i],
      t3 = (ivs[(i + 2) % 7] - a + 12) % 12,
      t5 = (ivs[(i + 4) % 7] - a + 12) % 12,
      t7 = (ivs[(i + 6) % 7] - a + 12) % 12;
    let q;
    if (kind === "triad")
      q = t3 === 4 && t5 === 7 ? "" : t3 === 3 && t5 === 7 ? "m" : t3 === 3 && t5 === 6 ? "dim" : "aug";
    else
      q =
        { "4,7,11": "M7", "4,7,10": "7", "3,7,10": "m7", "3,6,10": "m7(♭5)", "3,6,9": "dim7" }[[t3, t5, t7].join()] ||
        "?";
    const pre = ivs[i] < IV.major[i] ? "♭" : "";
    return {
      i,
      root: n,
      q,
      name: fmt(n) + q,
      deg: pre + ROMAN[i] + q,
      nd: DEG_OF[a] /* ルートの度数（主音から見た位置） */,
      tones: (kind === "triad" ? [0, 2, 4] : [0, 2, 4, 6]).map(k => fmt(notes[(i + k) % 7])),
      semis: [0, t3, t5, t7].slice(0, kind === "triad" ? 3 : 4) /* 構成音のルートからの半音数 */,
    };
  });
}
/* キーのダイアトニックコード。dominant = true のマイナーキーは、Ⅴ と Ⅶ だけハーモニックマイナーから借りる
   （曲で使うマイナーの形：Am なら Em → E / E7、G → G♯dim / G♯dim7。ほかの 5 つとスケールの音はナチュラルのまま） */
function chordsOf(type, root, kind, dominant = false) {
  const nat = chordsFrom(IV[type], root, kind);
  if (!(dominant && type === "minor")) return nat;
  const har = chordsFrom(IV.harmonic, root, kind);
  return nat.map((c, i) => (i === 4 || i === 6 ? har[i] : c));
}
function alter(n) {
  const p = parse(n);
  let ds = [1, -1].filter(d => Math.abs(p.a + d) <= 1);
  if (!ds.length) ds = [1, -1];
  return LET[p.l] + accStr(p.a + rnd(ds));
}
function enh(n) {
  const p = parse(n),
    v = pc(n);
  for (const dl of shuffle([1, -1])) {
    const l = (p.l + dl + 7) % 7;
    let d = (((v - LPC[l]) % 12) + 12) % 12;
    if (d > 6) d -= 12;
    if (Math.abs(d) <= 1) return LET[l] + accStr(d);
  }
  return null;
}
/* 調号の数（♯は正、♭は負） */
const keySig = (t, r) => spell(r, IV[t]).reduce((a, n) => a + parse(n).a, 0);
/* ♯系（調号なしを含む）を ♯の少ない順に、続けて♭系を ♭の少ない順に */
const KEYS = Object.fromEntries(
  Object.entries(FIFTHS).map(([t, ks]) => [
    t,
    [
      ...ks.filter(r => keySig(t, r) >= 0),
      ...ks.filter(r => keySig(t, r) < 0).sort((a, b) => keySig(t, b) - keySig(t, a)),
    ],
  ]),
);
const keyLabel = (t, r) => fmt(r) + (t === "minor" ? "m" : "");
const TLAB = { 3: "♭3", 4: "3", 6: "♭5", 7: "5", 8: "♯5", 9: "6", 10: "♭7", 11: "7" };
/* コードの構成音と、ルートから見た度数（dim7 の第7音は 6 ではなく ♭♭7 と書く） */
function toneInfo(t, r, i, kind, dominant = false) {
  const c = chordsOf(t, r, kind, dominant)[i];
  return c.tones.map((n, j) => ({ n, lab: j === 0 ? "R" : j === 3 && c.semis[j] === 9 ? "♭♭7" : TLAB[c.semis[j]] }));
}
function fill(ans, pref, extra) {
  const out = [ans];
  for (const x of [...pref, ...extra]) {
    if (x && !out.includes(x)) out.push(x);
    if (out.length === 4) break;
  }
  return shuffle(out);
}
/* 1 問を作る。k = {t:"major"|"minor", r:ルート, id}、mode = d2c|c2d|note、kind = triad|seventh、
   dominant = マイナーの Ⅴ・Ⅶ をハーモニックから借りるか（構成音の問題はスケールの音を問うので影響しない） */
function buildQuestion(k, mode, kind, dominant = false) {
  const ch = chordsOf(k.t, k.r, kind, dominant),
    notes = spell(k.r, IV[k.t]);
  const q = { key: k, mode, kind, dominant, ch, notes };
  if (mode === "d2c") {
    const c = rnd(ch);
    q.i = c.i;
    q.tok = c.deg;
    q.ans = c.name;
    const g1 = shuffle(QT[kind].filter(x => x !== c.q).map(x => fmt(c.root) + x));
    const g2 = [fmt(alter(c.root)) + c.q];
    const g3 = shuffle(ch.filter(o => o.i !== c.i).map(o => o.name));
    q.opts = fill(c.name, [g1[0], g2[0], g3[0]], [...g1, ...g3]);
    q.text = ["の", "は？"];
  } else if (mode === "c2d") {
    const c = rnd(ch);
    q.i = c.i;
    q.tok = c.name;
    q.ans = c.deg;
    q.opts = ch.map(o => o.deg);
    q.text = ["で", "は何度？"];
  } else {
    const i = 1 + Math.floor(Math.random() * 6);
    q.i = i;
    q.tok = NDEG[k.t][i];
    q.ans = fmt(notes[i]);
    const e = enh(notes[i]);
    q.opts = fill(
      q.ans,
      [fmt(alter(notes[i])), e ? fmt(e) : null, fmt(notes[(i + rnd([1, 6])) % 7])],
      notes.map(fmt).concat([fmt(alter(notes[i]))]),
    );
    q.text = ["の", "の音は？"];
  }
  return q;
}

if (typeof module !== "undefined")
  module.exports = {
    LET,
    LPC,
    IV,
    ROMAN,
    NDEG,
    DEG_OF,
    FIFTHS,
    QT,
    parse,
    accStr,
    pc,
    fmt,
    rnd,
    shuffle,
    spell,
    chordsFrom,
    chordsOf,
    alter,
    enh,
    keySig,
    KEYS,
    keyLabel,
    TLAB,
    toneInfo,
    fill,
    buildQuestion,
  };
