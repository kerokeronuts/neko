import React, { useState, useEffect, useCallback, useRef } from "react";
import { Camera, X, ChevronLeft, ChevronRight, Plus, Utensils, ClipboardList, Trash2, Pencil, Check } from "lucide-react";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

const C = {
  bg: "#F6EFE1",
  paper: "#FFFBF3",
  ink: "#3D2B1F",
  inkSoft: "#8A7663",
  ginger: "#DD8B3C",
  gingerDeep: "#B9691F",
  walnut: "#4A3527",
  sage: "#7C9473",
  sageDeep: "#5C7355",
  rose: "#C1607A",
  roseDeep: "#9C4560",
  line: "#E4D8C3",
};

const CAT_PALETTE = [C.gingerDeep, C.roseDeep];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const MEAL_OPTIONS = [
  { v: "完食", color: C.sage },
  { v: "少なめ", color: C.ginger },
  { v: "食べず", color: C.rose },
];
const POOP_OPTIONS = [
  { v: "普通", color: C.sage },
  { v: "ゆるめ", color: C.ginger },
  { v: "下痢", color: C.rose },
  { v: "なし", color: C.inkSoft },
];
const DEFAULT_CATS = [
  { id: "cat1", name: "バカちん", color: CAT_PALETTE[0] },
  { id: "cat2", name: "をぴ", color: CAT_PALETTE[1] },
];

function pad(n) { return String(n).padStart(2, "0"); }
function fmt(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayStr() { return fmt(new Date()); }

function PawStamp({ color = C.ginger, size = 30, rotate = -8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${rotate}deg)` }}>
      <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="3" strokeDasharray="6 5" opacity="0.85" />
      <ellipse cx="50" cy="62" rx="22" ry="18" fill={color} opacity="0.9" />
      <ellipse cx="27" cy="34" rx="10" ry="13" fill={color} opacity="0.9" transform="rotate(-18 27 34)" />
      <ellipse cx="50" cy="24" rx="10.5" ry="14" fill={color} opacity="0.9" />
      <ellipse cx="73" cy="34" rx="10" ry="13" fill={color} opacity="0.9" transform="rotate(18 73 34)" />
    </svg>
  );
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("読み込みに失敗しました"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.onload = () => {
        const maxDim = 640;
        let { width, height } = img;
        if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
        else if (height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function fetchCats() {
  const snap = await getDoc(doc(db, "meta", "cats"));
  return snap.exists() ? snap.data().list : DEFAULT_CATS;
}
async function saveCats(list) {
  await setDoc(doc(db, "meta", "cats"), { list });
}
async function fetchIndex(catId) {
  const snap = await getDoc(doc(db, "index", catId));
  return snap.exists() ? snap.data().data : {};
}
async function saveIndex(catId, data) {
  await setDoc(doc(db, "index", catId), { data });
}
async function fetchEntry(catId, dateStr) {
  const snap = await getDoc(doc(db, "entries", `${catId}_${dateStr}`));
  return snap.exists() ? snap.data() : null;
}
async function saveEntryDoc(catId, dateStr, entry) {
  await setDoc(doc(db, "entries", `${catId}_${dateStr}`), entry);
}
async function deleteEntryDoc(catId, dateStr) {
  await deleteDoc(doc(db, "entries", `${catId}_${dateStr}`));
}

export default function App() {
  const [cats, setCats] = useState(DEFAULT_CATS);
  const [activeCat, setActiveCat] = useState("cat1");
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [indexByCat, setIndexByCat] = useState({});
  const [selected, setSelected] = useState(todayStr());
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ date: todayStr(), photo: null, meal: "完食", poop: "普通", memo: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const catList = await fetchCats();
        setCats(catList);
        const nextIndex = {};
        for (const c of catList) {
          nextIndex[c.id] = await fetchIndex(c.id);
        }
        setIndexByCat(nextIndex);
      } catch (e) {
        setError("データの読み込みに失敗しました。通信環境をご確認ください。");
      }
      setLoading(false);
    })();
  }, []);

  const index = indexByCat[activeCat] || {};

  const loadDetail = useCallback(async (dateStr, catId) => {
    const idx = indexByCat[catId] || {};
    if (!idx[dateStr]) { setDetail(null); return; }
    try {
      const entry = await fetchEntry(catId, dateStr);
      setDetail(entry);
    } catch { setDetail(null); }
  }, [indexByCat]);

  useEffect(() => { if (!loading) loadDetail(selected, activeCat); }, [selected, activeCat, loading, loadDetail]);

  function switchCat(catId) {
    setActiveCat(catId);
    setSelected(todayStr());
  }

  function openAdd(dateStr) {
    const existing = index[dateStr];
    setForm({
      date: dateStr,
      photo: existing && detail && detail.photo ? detail.photo : null,
      meal: (existing && detail && detail.meal) || "完食",
      poop: (existing && detail && detail.poop) || "普通",
      memo: (existing && detail && detail.memo) || "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setForm((f) => ({ ...f, photo: dataUrl }));
    } catch { setError("写真の読み込みに失敗しました。もう一度お試しください。"); }
  }

  async function saveEntry() {
    if (!form.photo) { setError("写真を選んでください。"); return; }
    setSaving(true);
    setError("");
    try {
      const entry = { photo: form.photo, meal: form.meal, poop: form.poop, memo: form.memo };
      await saveEntryDoc(activeCat, form.date, entry);
      const newCatIndex = { ...index, [form.date]: { hasPhoto: true, meal: form.meal, poop: form.poop } };
      await saveIndex(activeCat, newCatIndex);
      setIndexByCat((prev) => ({ ...prev, [activeCat]: newCatIndex }));
      if (form.date === selected) setDetail(entry);
      setModalOpen(false);
    } catch { setError("保存に失敗しました。通信環境をご確認のうえ、もう一度お試しください。"); }
    setSaving(false);
  }

  async function deleteEntry(dateStr) {
    try {
      await deleteEntryDoc(activeCat, dateStr);
      const newCatIndex = { ...index };
      delete newCatIndex[dateStr];
      await saveIndex(activeCat, newCatIndex);
      setIndexByCat((prev) => ({ ...prev, [activeCat]: newCatIndex }));
      if (dateStr === selected) setDetail(null);
    } catch { setError("削除に失敗しました。"); }
  }

  function startRename(cat) {
    setRenaming(cat.id);
    setRenameValue(cat.name);
  }

  async function saveRename() {
    const name = renameValue.trim() || cats.find((c) => c.id === renaming).name;
    const newCats = cats.map((c) => (c.id === renaming ? { ...c, name } : c));
    setCats(newCats);
    setRenaming(null);
    try { await saveCats(newCats); } catch { /* 次回起動時に再試行される想定 */ }
  }

  const year = month.getFullYear(), mo = month.getMonth();
  const firstDow = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const entryCount = Object.keys(index).length;
  let streak = 0;
  {
    let cursor = new Date();
    while (index[fmt(cursor)]) { streak++; cursor.setDate(cursor.getDate() - 1); }
  }

  const statusColor = (rec) => {
    if (!rec) return C.line;
    if (rec.poop === "下痢" || rec.meal === "食べず") return C.rose;
    if (rec.poop === "ゆるめ" || rec.meal === "少なめ") return C.ginger;
    return C.sage;
  };

  const activeCatObj = cats.find((c) => c.id === activeCat) || cats[0];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif", color: C.ink }} className="pb-24">
      <div className="px-5 pt-7 pb-4" style={{ borderBottom: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2">
          <PawStamp color={C.gingerDeep} size={26} rotate={-14} />
          <h1 style={{ color: C.walnut, letterSpacing: "0.04em" }} className="text-xl font-bold">森家の猫日記</h1>
        </div>
        <p style={{ color: C.inkSoft }} className="text-xs mt-1 ml-1">バカちんとをぴの健康記録</p>

        <div className="flex gap-2 mt-4">
          {cats.map((c) => {
            const isActive = c.id === activeCat;
            return (
              <div key={c.id} className="flex items-center">
                <button
                  onClick={() => switchCat(c.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    background: isActive ? c.color : C.paper,
                    color: isActive ? C.paper : C.inkSoft,
                    border: `1px solid ${isActive ? c.color : C.line}`,
                  }}
                >
                  <PawStamp color={isActive ? C.paper : c.color} size={14} rotate={0} />
                  {c.name}
                </button>
                {isActive && (
                  <button onClick={() => startRename(c)} className="ml-1 p-1 rounded-full" style={{ color: C.inkSoft }}>
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 mt-3 ml-1">
          <div className="text-xs" style={{ color: C.inkSoft }}>記録日数<span style={{ color: activeCatObj.color }} className="text-base font-bold ml-1">{entryCount}</span>日</div>
          <div className="text-xs" style={{ color: C.inkSoft }}>連続記録<span style={{ color: activeCatObj.color }} className="text-base font-bold ml-1">{streak}</span>日</div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonth(new Date(year, mo - 1, 1))} className="p-2 rounded-full" style={{ color: C.walnut }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ color: C.walnut }} className="font-bold text-base tracking-wide">{year}年 {mo + 1}月</div>
          <button onClick={() => setMonth(new Date(year, mo + 1, 1))} className="p-2 rounded-full" style={{ color: C.walnut }}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-xs font-bold" style={{ color: C.inkSoft }}>{w}</div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm" style={{ color: C.inkSoft }}>読み込み中…</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const dateStr = fmt(new Date(year, mo, d));
              const rec = index[dateStr];
              const isSelected = dateStr === selected;
              const isToday = dateStr === todayStr();
              return (
                <button
                  key={i}
                  onClick={() => setSelected(dateStr)}
                  className="relative flex flex-col items-center justify-center rounded-xl"
                  style={{
                    aspectRatio: "1/1",
                    background: isSelected ? C.walnut : C.paper,
                    border: isToday && !isSelected ? `1.5px solid ${activeCatObj.color}` : `1px solid ${C.line}`,
                  }}
                >
                  <span className="text-sm" style={{ color: isSelected ? C.paper : C.ink, fontWeight: isToday ? 700 : 500 }}>{d}</span>
                  {rec && (
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? C.paper : statusColor(rec) }} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 mt-6">
        <div className="rounded-2xl p-4" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: C.walnut }} className="font-bold text-sm tracking-wide">
              {selected.replace(/-/g, "/")}　<span style={{ color: activeCatObj.color }}>{activeCatObj.name}</span>
            </div>
            {detail && (
              <div className="flex gap-2">
                <button onClick={() => openAdd(selected)} className="p-1.5 rounded-full" style={{ background: C.bg, color: C.walnut }}><Pencil size={14} /></button>
                <button onClick={() => deleteEntry(selected)} className="p-1.5 rounded-full" style={{ background: C.bg, color: C.roseDeep }}><Trash2 size={14} /></button>
              </div>
            )}
          </div>

          {detail ? (
            <div>
              <img src={detail.photo} alt="猫の写真" className="w-full rounded-xl mb-3" style={{ maxHeight: 320, objectFit: "cover" }} />
              <div className="flex gap-2 mb-2">
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: C.bg, color: C.walnut }}>
                  <Utensils size={12} /> 食事：{detail.meal}
                </span>
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: C.bg, color: C.walnut }}>
                  <ClipboardList size={12} /> 排便：{detail.poop}
                </span>
              </div>
              {detail.memo && <p className="text-sm mt-2" style={{ color: C.inkSoft }}>{detail.memo}</p>}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm mb-3" style={{ color: C.inkSoft }}>{activeCatObj.name}の、この日の記録はまだありません</p>
              <button
                onClick={() => openAdd(selected)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold"
                style={{ background: activeCatObj.color, color: C.paper }}
              >
                <Plus size={15} /> 記録を追加
              </button>
            </div>
          )}
        </div>
        {error && <p className="text-xs mt-3 text-center" style={{ color: C.roseDeep }}>{error}</p>}
      </div>

      <button
        onClick={() => openAdd(todayStr())}
        className="fixed bottom-6 right-6 rounded-full flex items-center justify-center shadow-lg"
        style={{ width: 56, height: 56, background: activeCatObj.color, color: C.paper }}
      >
        <Camera size={22} />
      </button>

      {renaming && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-6" style={{ background: "rgba(61,43,31,0.45)" }} onClick={() => setRenaming(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-2xl p-5" style={{ background: C.paper, maxWidth: 340 }}>
            <div style={{ color: C.walnut }} className="font-bold text-sm mb-3">名前を変更</div>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full rounded-xl p-3 text-sm mb-4"
              style={{ background: C.bg, border: `1px solid ${C.line}`, color: C.ink }}
              maxLength={12}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setRenaming(null)} className="flex-1 py-2.5 rounded-full text-sm font-bold" style={{ background: C.bg, color: C.inkSoft }}>キャンセル</button>
              <button onClick={saveRename} className="flex-1 py-2.5 rounded-full text-sm font-bold" style={{ background: C.gingerDeep, color: C.paper }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: "rgba(61,43,31,0.45)" }} onClick={() => setModalOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-3xl p-5 max-h-[88vh] overflow-y-auto"
            style={{ background: C.paper, maxWidth: 480 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div style={{ color: C.walnut }} className="font-bold text-base">{activeCatObj.name}　{form.date.replace(/-/g, "/")}</div>
              <button onClick={() => setModalOpen(false)} style={{ color: C.inkSoft }}><X size={20} /></button>
            </div>

            <label className="block mb-1 text-xs font-bold" style={{ color: C.inkSoft }}>写真</label>
            <div
              onClick={() => fileRef.current && fileRef.current.click()}
              className="rounded-xl mb-4 flex items-center justify-center cursor-pointer overflow-hidden"
              style={{ height: form.photo ? 200 : 120, background: C.bg, border: `1.5px dashed ${C.line}` }}
            >
              {form.photo ? (
                <img src={form.photo} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1" style={{ color: C.inkSoft }}>
                  <Camera size={22} />
                  <span className="text-xs">タップして写真を選ぶ</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

            <label className="block mb-1.5 text-xs font-bold" style={{ color: C.inkSoft }}>食事の様子</label>
            <div className="flex gap-2 mb-4">
              {MEAL_OPTIONS.map((o) => (
                <button
                  key={o.v}
                  onClick={() => setForm((f) => ({ ...f, meal: o.v }))}
                  className="flex-1 text-xs font-bold py-2 rounded-full"
                  style={{ background: form.meal === o.v ? o.color : C.bg, color: form.meal === o.v ? C.paper : C.inkSoft }}
                >
                  {o.v}
                </button>
              ))}
            </div>

            <label className="block mb-1.5 text-xs font-bold" style={{ color: C.inkSoft }}>排便の様子</label>
            <div className="flex gap-2 mb-4">
              {POOP_OPTIONS.map((o) => (
                <button
                  key={o.v}
                  onClick={() => setForm((f) => ({ ...f, poop: o.v }))}
                  className="flex-1 text-xs font-bold py-2 rounded-full"
                  style={{ background: form.poop === o.v ? o.color : C.bg, color: form.poop === o.v ? C.paper : C.inkSoft }}
                >
                  {o.v}
                </button>
              ))}
            </div>

            <label className="block mb-1.5 text-xs font-bold" style={{ color: C.inkSoft }}>メモ（任意）</label>
            <textarea
              value={form.memo}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
              placeholder="今日の様子、気づいたことなど"
              className="w-full rounded-xl p-3 text-sm mb-4"
              style={{ background: C.bg, border: `1px solid ${C.line}`, color: C.ink, minHeight: 70 }}
            />

            {error && <p className="text-xs mb-3" style={{ color: C.roseDeep }}>{error}</p>}

            <button
              onClick={saveEntry}
              disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-full font-bold text-sm"
              style={{ background: activeCatObj.color, color: C.paper, opacity: saving ? 0.6 : 1 }}
            >
              <Check size={16} /> {saving ? "保存中…" : "保存する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
