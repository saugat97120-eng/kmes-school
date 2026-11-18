import Container from "../common/Container";
import Button from "../common/Button";
import { useSiteSettings } from "../../context/useSiteSettings";
import { Sparkles, PhoneCall, CheckCircle } from "lucide-react";

export default function AdmissionSection() {
  const { settings } = useSiteSettings();
  const schoolName = settings.schoolName || "Kaseni Model Secondary English School";
  const phone = settings.phone || "+977 9842089044";
  const rawPhone = phone.split(/[,/]/)[0].trim().replace(/[^0-9+]/g, "");

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-navy via-navy-2 to-navy py-20 text-center text-white">
      {/* Decorative Circles */}
      <div className="absolute top-0 right-1/4 h-72 w-72 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      <Container className="relative z-10">
        <div className="mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/10 px-3.5 py-1 backdrop-blur-md">
            <Sparkles size={14} className="text-gold" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gold">
              Admissions Desk 2083
            </span>
          </div>

          <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl text-white">
            Enroll Your Child for Academic Excellence
          </h2>

          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            {settings.admissionsStatus ? (
              <>
                Admissions are currently{" "}
                <span className="text-gold font-bold">{settings.admissionsStatus}</span>
                {settings.academicSession ? ` for the upcoming session.` : "."} We welcome prospective students from Nursery to Grade 9 to join {schoolName}.
              </>
            ) : (
              `For current seat availability and admission criteria from Nursery to Grade 9, contact the school administration office.`
            )}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <Button
              to="/admissions"
              variant="gold"
              showArrow
              className="rounded-xl px-6 py-3.5 text-xs font-bold uppercase tracking-wider shadow-lg shadow-gold/20"
            >
              Fill Online Admission Form
            </Button>

            <a
              href={`tel:${rawPhone}`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <PhoneCall size={14} className="text-gold" />
              <span>Call Office: {phone}</span>
            </a>
          </div>

          {/* Quick Pillars */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-400" />
              Entrance Assessment
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-400" />
              English Medium Standard
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-400" />
              Belbari-05 Kaseni, Morang
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
