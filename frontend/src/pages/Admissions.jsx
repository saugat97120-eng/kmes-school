import { useEffect, useState } from "react";
import { API_BASE } from "../config";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import Button from "../components/common/Button";
import { useSiteSettings } from "../context/useSiteSettings";
import { Calendar, CheckCircle2 } from "lucide-react";

const defaultPage = {
  slug: "admissions",
  title: "Admissions",
  eyebrow: "Admissions",
  description: "Admission information and next steps for families joining KMES.",
  admissionsIntro: "",
  admissionsCtaText: "Contact for Admission",
  admissionsCtaLink: "/contact",
};

function Admissions() {
  const { settings } = useSiteSettings();
  const [page, setPage] = useState(defaultPage);

  useEffect(() => {
    const loadPage = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/page-content?slug=admissions`);
        const data = await res.json();
        if (data?.success && data.data) {
          setPage({ ...defaultPage, ...data.data });
        }
      } catch (error) {
        console.error("Failed to load Admissions page content", error);
      }
    };

    loadPage();
  }, []);

  const schoolName = settings.schoolName || "Kaseni Model Secondary English School";
  const defaultIntro = `For current admission availability and information, please contact ${schoolName}.`;

  return (
    <div>
      <PageHeader
        eyebrow={page.eyebrow || defaultPage.eyebrow}
        title={page.title || defaultPage.title}
        description={page.description || defaultPage.description}
      />
      <section className="py-24 text-center">
        <Container className="max-w-2xl">
          {(settings.academicSession || settings.admissionsStatus) && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2 text-left">
              {settings.academicSession && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy">
                    <Calendar size={16} className="text-gold" /> Academic Session
                  </div>
                  <p className="mt-1 font-serif text-lg font-bold text-navy">
                    {settings.academicSession}
                  </p>
                </div>
              )}
              {settings.admissionsStatus && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy">
                    <CheckCircle2 size={16} className="text-gold" /> Admission Status
                  </div>
                  <p className="mt-1 font-serif text-lg font-bold text-navy">
                    {settings.admissionsStatus}
                  </p>
                </div>
              )}
            </div>
          )}

          <h2 className="font-serif text-2xl font-bold text-navy">Interested in admission?</h2>
          <p className="mt-4 leading-7 text-gray-600">
            {page.admissionsIntro || defaultIntro}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button to={page.admissionsCtaLink || "/contact"} variant="gold" showArrow>
              {page.admissionsCtaText || defaultPage.admissionsCtaText}
            </Button>
            {settings.facebookUrl && (
              <a
                href={settings.facebookUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-navy px-6 py-3 font-semibold text-navy transition hover:bg-navy hover:text-white"
              >
                Message on Facebook
              </a>
            )}
          </div>
        </Container>
      </section>
    </div>
  );
}

export default Admissions;
