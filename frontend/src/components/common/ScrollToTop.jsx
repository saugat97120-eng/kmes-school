import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Router keeps the previous scroll position on navigation; reset it on each new page.
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default ScrollToTop;
