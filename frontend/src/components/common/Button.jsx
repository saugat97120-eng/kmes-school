import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Button({
  children,
  to,
  variant = "primary",
  showArrow = false,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold transition cursor-pointer";

  const variants = {
    primary: "bg-navy text-white hover:bg-navy-2 shadow-xs",
    gold: "bg-gold text-navy hover:bg-gold-light shadow-xs",
    outline: "border border-slate-300 text-navy hover:bg-navy hover:text-white shadow-xs",
    light: "border border-white/40 text-white hover:bg-white hover:text-navy shadow-xs",
  };

  const fullClassName = `${base} ${variants[variant]} ${className}${
    disabled ? " opacity-60 cursor-not-allowed pointer-events-none" : ""
  }`.trim();

  if (to) {
    return (
      <Link to={to} className={fullClassName}>
        {children}
        {showArrow && <ArrowRight size={18} />}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={fullClassName} disabled={disabled}>
      {children}
      {showArrow && <ArrowRight size={18} />}
    </button>
  );
}
