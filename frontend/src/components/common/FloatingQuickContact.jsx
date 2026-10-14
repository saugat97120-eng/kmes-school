import { useState } from "react";
import { MessageCircle, Phone, Mail, Clock, X, ChevronUp, Send } from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";
import { isPlaceholder } from "../../utils/format";

function FloatingQuickContact() {
  const { settings } = useSiteSettings();
  const [open, setOpen] = useState(false);

  const phone = !isPlaceholder(settings.phone) ? settings.phone : "+977-9800000000";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  const email = !isPlaceholder(settings.email) ? settings.email : "info@kmes.edu.np";
  const hours = settings.workingHours || "Sun - Fri: 9:00 AM - 4:00 PM";

  // WhatsApp click handler
  const waNumber = cleanPhone.startsWith("+") ? cleanPhone.replace("+", "") : `977${cleanPhone}`;
  const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent("Namaste! I would like to inquire about KMES School admissions and programs.")}`;

  return (
    <div className="fixed bottom-6 right-6 z-40 print:hidden">
      {/* Expanded Quick Contact Card */}
      {open && (
        <div className="mb-3 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl transition-all duration-200">
          <div className="bg-navy p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif text-base font-bold">KMES Support Desk</h4>
                <p className="text-xs text-gray-300">Quick inquiries & admissions assistance</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-gray-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close contact card"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="space-y-3 p-4 text-sm">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3 font-medium text-green-800 transition hover:bg-green-100"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white">
                <Send size={16} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-green-700">WhatsApp Chat</div>
                <div className="text-sm font-semibold">Message Administration</div>
              </div>
            </a>

            {/* Direct Phone */}
            <a
              href={`tel:${cleanPhone}`}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-gray-700 transition hover:bg-gray-100 hover:text-navy"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white">
                <Phone size={16} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500">Call Office</div>
                <div className="font-medium text-gray-900">{phone}</div>
              </div>
            </a>

            {/* Email */}
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-gray-700 transition hover:bg-gray-100 hover:text-navy"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-white">
                <Mail size={16} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500">Email Us</div>
                <div className="font-medium text-gray-900 truncate max-w-[180px]">{email}</div>
              </div>
            </a>

            {/* Office Hours */}
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <Clock size={14} className="text-gold" />
              <span>{hours}</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-white shadow-lg transition-transform hover:scale-105 hover:bg-gold-light focus:outline-none focus:ring-4 focus:ring-gold/30"
        aria-label="Open quick contact menu"
      >
        {open ? <ChevronUp size={24} /> : <MessageCircle size={26} />}
      </button>
    </div>
  );
}

export default FloatingQuickContact;
