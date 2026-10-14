import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

function Button({ children, to, variant = "primary", showArrow = false, onClick, type = "button", disabled = false }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 font-semibold transition cursor-pointer";

  const variants = {
    primary: "bg-navy text-white hover:bg-navy-2",
    gold: "bg-gold text-navy hover:bg-gold-light",
    outline: "border border-navy text-navy hover:bg-navy hover:text-white",
    light: "border border-white/30 text-white hover:bg-white/10",
  };

  const className = `${base} ${variants[variant]}${disabled ? " opacity-60 cursor-not-allowed pointer-events-none" : ""}`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {children}
        {showArrow && <ArrowRight size={18} />}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={className} disabled={disabled}>
      {children}
      {showArrow && <ArrowRight size={18} />}
    </button>
  );
}

export default Button;
