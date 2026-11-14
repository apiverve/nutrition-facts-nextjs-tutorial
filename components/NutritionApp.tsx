'use client';

import { useEffect, useMemo, useState } from 'react';

type Macros = { calories: number; protein: number; totalFat: number; carbohydrates: number; fiber: number; sugars: number };
type Food = {
  food: string;
  category?: string;
  basis?: string;
  servingSizes?: { label: string; grams: number }[];
  nutrition: Macros;
  micronutrients?: Record<string, number | null> | null;
};
type Result = Food & { error?: string; code?: string };
type PlateItem = { name: string; grams: number; per100: Macros };

const STARTERS = ['banana', 'oatmeal', 'avocado', 'chicken breast', 'brown rice', 'greek yogurt'];
const PLATE_KEY = 'nutrition:plate';

// Colors for the macro ring and bars.
const MACRO = [
  { key: 'protein', label: 'Protein', kcal: 4, color: '#3c8d5a' },
  { key: 'carbohydrates', label: 'Carbs', kcal: 4, color: '#e0a32e' },
  { key: 'totalFat', label: 'Fat', kcal: 9, color: '#d0644a' }
] as const;

const scale = (v: number, grams: number) => (v * grams) / 100;
const fmt = (v: number, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString();

/** A ring showing where the calories come from: protein and carbs at 4 kcal/g, fat at 9. */
function MacroRing({ n }: { n: Macros }) {
  const parts = MACRO.map((m) => ({ ...m, kcal: (n[m.key] || 0) * m.kcal }));
  const total = parts.reduce((s, p) => s + p.kcal, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="ring" role="img" aria-label="Where the calories come from">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e7ecdf" strokeWidth="16" />
      {parts.map((p) => {
        const len = (p.kcal / total) * c;
        const el = (
          <circle key={p.key} cx="70" cy="70" r={r} fill="none" stroke={p.color} strokeWidth="16"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

export default function NutritionApp() {
  const [query, setQuery] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [missingKey, setMissingKey] = useState(false);
  const [plate, setPlate] = useState<PlateItem[]>([]);

  useEffect(() => {
    try {
      setPlate(JSON.parse(localStorage.getItem(PLATE_KEY) || '[]'));
    } catch {}
    lookUp(new URLSearchParams(location.search).get('food') || 'banana');
  }, []);

  function savePlate(next: PlateItem[]) {
    setPlate(next);
    try {
      localStorage.setItem(PLATE_KEY, JSON.stringify(next));
    } catch {}
  }

  async function lookUp(term: string) {
    const t = term.trim();
    if (!t) return;
    setQuery(t);
    setLoading(true);
    setError('');
    const res = await fetch(`/api/nutrition?food=${encodeURIComponent(t)}`);
    const data: Result = await res.json().catch(() => ({ error: 'Something went wrong' }) as Result);
    setLoading(false);
    if (data.code === 'missing_key') return setMissingKey(true);
    if (data.error) {
      return setError(res.status === 429 ? 'Too many lookups. Wait a minute and try again.' : /not found|no matching/i.test(data.error) ? `No match for “${t}”. Try a simpler name, like “apple”.` : data.error);
    }
    setFood(data);
    setGrams(data.servingSizes?.[0]?.grams || 100);
  }

  const n = useMemo(() => {
    if (!food) return null;
    const out = {} as Macros;
    for (const k of Object.keys(food.nutrition) as (keyof Macros)[]) out[k] = scale(food.nutrition[k] || 0, grams);
    return out;
  }, [food, grams]);

  const totals = useMemo(
    () =>
      plate.reduce(
        (t, p) => ({
          calories: t.calories + scale(p.per100.calories, p.grams),
          protein: t.protein + scale(p.per100.protein, p.grams),
          carbohydrates: t.carbohydrates + scale(p.per100.carbohydrates, p.grams),
          totalFat: t.totalFat + scale(p.per100.totalFat, p.grams)
        }),
        { calories: 0, protein: 0, carbohydrates: 0, totalFat: 0 }
      ),
    [plate]
  );

  const micros = food?.micronutrients ? Object.entries(food.micronutrients).filter(([, v]) => v != null) : [];

  if (missingKey) {
    return (
      <main className="app">
        <section className="card setup">
          <p className="tag">One step left</p>
          <h1>Add your API key</h1>
          <p>
            Food data comes from the APIVerve Nutrition API. Create a free key at{' '}
            <a href="https://dashboard.apiverve.com/signup?api=nutrition&utm_source=template&utm_medium=app&utm_campaign=nutrition-facts-nextjs-tutorial">dashboard.apiverve.com</a>, set{' '}
            <code>APIVERVE_API_KEY</code> in <code>.env</code> or in your Vercel project, and reload.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="head">
        <div className="brand">
          <span className="leaf">◐</span> Nutrition Facts
        </div>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            lookUp(query);
          }}
        >
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a food" aria-label="Food" maxLength={60} />
          <button disabled={loading}>{loading ? '…' : 'Search'}</button>
        </form>
        <div className="starters">
          {STARTERS.map((s) => (
            <button key={s} onClick={() => lookUp(s)}>{s}</button>
          ))}
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="grid">
        {food && n && (
          <section className="card label" aria-live="polite">
            <p className="tag">{food.category}</p>
            <h1>{food.food}</h1>

            <label className="serving">
              <span>Serving</span>
              <select value={grams} onChange={(e) => setGrams(Number(e.target.value))}>
                <option value={100}>100 g</option>
                {food.servingSizes?.map((s) => (
                  <option key={s.label} value={s.grams}>{s.label} ({s.grams} g)</option>
                ))}
              </select>
            </label>

            <div className="hero">
              <div className="ringwrap">
                <MacroRing n={n} />
                <div className="kcal">
                  <strong>{fmt(n.calories, 0)}</strong>
                  <span>kcal</span>
                </div>
              </div>
              <ul className="macros">
                {MACRO.map((m) => (
                  <li key={m.key}>
                    <i style={{ background: m.color }} />
                    <span>{m.label}</span>
                    <b>{fmt(n[m.key])} g</b>
                  </li>
                ))}
                <li className="sub"><span>Fiber</span><b>{fmt(n.fiber)} g</b></li>
                <li className="sub"><span>Sugars</span><b>{fmt(n.sugars)} g</b></li>
              </ul>
            </div>

            <button className="add" onClick={() => savePlate([...plate, { name: food.food, grams, per100: food.nutrition }].slice(-20))}>
              + Add to my plate
            </button>

            {micros.length > 0 && (
              <details className="micros">
                <summary>Vitamins and minerals (per 100 g)</summary>
                <ul>
                  {micros.map(([k, v]) => (
                    <li key={k}>
                      <span>{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                      <b>{fmt(v as number, 2)}</b>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}

        <aside className="card plate">
          <h2>My plate</h2>
          {plate.length === 0 ? (
            <p className="muted">Add foods to see your meal’s total. It’s saved on this device.</p>
          ) : (
            <>
              <ul>
                {plate.map((p, i) => (
                  <li key={i}>
                    <span>
                      {p.name.split(',')[0]} <small>{p.grams} g</small>
                    </span>
                    <b>{fmt(scale(p.per100.calories, p.grams), 0)} kcal</b>
                    <button aria-label={`Remove ${p.name}`} onClick={() => savePlate(plate.filter((_, j) => j !== i))}>×</button>
                  </li>
                ))}
              </ul>
              <div className="total">
                <span>Total</span>
                <b>{fmt(totals.calories, 0)} kcal</b>
              </div>
              <p className="split">
                P {fmt(totals.protein, 0)} g · C {fmt(totals.carbohydrates, 0)} g · F {fmt(totals.totalFat, 0)} g
              </p>
              <button className="clear" onClick={() => savePlate([])}>Clear plate</button>
            </>
          )}
        </aside>
      </div>

      <p className="foot">
        Data from the <a href="https://apiverve.com/marketplace/nutrition?utm_source=template&utm_medium=app&utm_campaign=nutrition-facts-nextjs-tutorial">APIVerve Nutrition API</a>. Not medical advice.
      </p>
    </main>
  );
}
