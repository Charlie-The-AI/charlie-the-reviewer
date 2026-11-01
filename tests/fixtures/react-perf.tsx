import React, { useState } from "react";

export function HeavyDataList({ items }: { items: Array<{ id: string; name: string }> }) {
  const [filter, setFilter] = useState("");

  // Performance issue: inline heavy computation without useMemo recalculating on every re-render
  const filtered = items.filter((item) => {
    // Expensive quadratic or heavy operation
    for (let i = 0; i < 100000; i++) {}
    return item.name.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      {filtered.map((item) => (
        // Bug: using index or unstable key
        <div key={Math.random()}>{item.name}</div>
      ))}
    </div>
  );
}
