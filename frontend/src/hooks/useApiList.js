import { useEffect, useState } from "react";

// Loads a list once from a public fetcher. `fetcher` must be a stable function
// reference (the helpers in utils/apiHelpers.js are).
export default function useApiList(fetcher) {
  const [state, setState] = useState({ items: [], loading: true, error: false });

  useEffect(() => {
    let live = true;
    fetcher()
      .then((data) => {
        if (live) setState({ items: Array.isArray(data) ? data : [], loading: false, error: false });
      })
      .catch(() => {
        if (live) setState({ items: [], loading: false, error: true });
      });
    return () => {
      live = false;
    };
  }, [fetcher]);

  return state;
}
