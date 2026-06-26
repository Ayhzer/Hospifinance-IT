/**
 * Hook pour réordonner les colonnes d'un tableau par drag & drop
 * Persiste l'ordre dans localStorage
 */
import { useState, useCallback, useRef } from 'react';

const PREFIX = 'hospi_col_order_';

export const useColumnOrder = (tableId, defaultKeys) => {
  const [order, setOrder] = useState(() => {
    try {
      const stored = localStorage.getItem(PREFIX + tableId);
      if (stored) {
        const parsed = JSON.parse(stored);
        const valid = parsed.filter(k => defaultKeys.includes(k));
        const missing = defaultKeys.filter(k => !valid.includes(k));
        return [...valid, ...missing];
      }
    } catch {}
    return [...defaultKeys];
  });

  const dragKeyRef = useRef(null);
  const [dropTarget, setDropTarget] = useState(null);

  const persist = (newOrder) => {
    try { localStorage.setItem(PREFIX + tableId, JSON.stringify(newOrder)); } catch {}
  };

  const resetOrder = useCallback(() => {
    setOrder([...defaultKeys]);
    try { localStorage.removeItem(PREFIX + tableId); } catch {}
  }, [tableId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Props à spread sur l'élément draggable (l'icône grip) */
  const getDragSourceProps = useCallback((colKey) => ({
    draggable: true,
    onDragStart: (e) => {
      dragKeyRef.current = colKey;
      e.dataTransfer.effectAllowed = 'move';
      const th = e.currentTarget.closest('th');
      if (th) th.style.opacity = '0.4';
    },
    onDragEnd: (e) => {
      const th = e.currentTarget.closest('th');
      if (th) th.style.opacity = '';
      setDropTarget(null);
      dragKeyRef.current = null;
    },
  }), []);

  /** Props à spread sur le <th> cible (zone de dépôt) */
  const getDropProps = useCallback((colKey) => ({
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragKeyRef.current && dragKeyRef.current !== colKey) {
        setDropTarget(colKey);
      }
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null);
    },
    onDrop: (e) => {
      e.preventDefault();
      const fromKey = dragKeyRef.current;
      if (fromKey && fromKey !== colKey) {
        setOrder(prev => {
          const arr = [...prev];
          const fi = arr.indexOf(fromKey);
          const ti = arr.indexOf(colKey);
          if (fi !== -1 && ti !== -1) {
            arr.splice(fi, 1);
            arr.splice(ti, 0, fromKey);
            persist(arr);
            return arr;
          }
          return prev;
        });
      }
      setDropTarget(null);
      dragKeyRef.current = null;
    },
  }), [tableId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { order, resetOrder, getDragSourceProps, getDropProps, dropTarget };
};
