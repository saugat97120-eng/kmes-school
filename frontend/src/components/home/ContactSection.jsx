import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import { MapPin, Phone, Mail } from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";
import { isPlaceholder } from "../../utils/format";

export default function ContactSection() {
  const { settings } = useSiteSettings();

  const phone = !isPlaceholder(settings.phone) ? settings.phone : "+977 9842089044, 9817361024";
  const email = !isPlaceholder(settings.email) ? settings.email : "ivanbhattarai042@gmail.com";
  const address = settings.address || "Belbari-05, Kaseni, Morang";
  const rawPhone = phone.split(/[,/]/)[0].trim().replace(/[^0-9+]/g, "");

  return (
    <section className="py-20 bg-white border-t border-slate-100">
      <Container>
        <SectionHeading
          eyebrow="Help Desk & Inquiries"
          title="Connect with Our Administration"
          description="We welcome visits from prospective parents and inquiries regarding enrollment, fee structures, and bus transport."
          centered
        />

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {/* Address Deck Card */}
          <div className="deck-card flex flex-col justify-between p-6 text-center">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <MapPin size={22} />
              </div>
              <h3 className="mt-4 text-sm font-bold text-navy">Campus Location</h3>
              <p className="mt-1 text-xs text-slate-600 leading-5">{address}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
              Koshy Province, Nepal
            </div>
          </div>

          {/* Phone Deck Card */}
          <div className="deck-card flex flex-col justify-between p-6 text-center">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Phone size={22} />
              </div>
              <h3 className="mt-4 text-sm font-bold text-navy">Direct Line / Principal</h3>
              <a
                href={`tel:${rawPhone}`}
                className="mt-1 block text-xs font-semibold text-navy hover:text-gold transition"
              >
                {phone}
              </a>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-600">
              Sun – Fri: 9:00 AM – 4:00 PM
            </div>
          </div>

          {/* Email Deck Card */}
          <div className="deck-card flex flex-col justify-between p-6 text-center">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
                <Mail size={22} />
              </div>
              <h3 className="mt-4 text-sm font-bold text-navy">Official Email</h3>
              <a
                href={`mailto:${email}`}
                className="mt-1 block text-xs font-semibold text-navy hover:text-gold transition truncate"
              >
                {email}
              </a>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-400">
              Direct Inquiries
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Button to="/contact" variant="primary" showArrow className="rounded-xl px-6 py-3 text-xs font-bold">
            Send an Online Inquiry Message
          </Button>
        </div>
      </Container>
    </section>
  );
}
