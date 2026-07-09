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
      const entry = { photo: form.photo, meal: form.meal, poop: form.poop, memo
