import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import Button from "../components/common/Button";

const defaultPage = {
  slug: "admissions",
  title: "Admissions",
  eyebrow: "Admissions",
  description: "Admission information and next steps for families joining KMES.",
  admissionsIntro:
    "For current admission availability and information, please contact Kaseni Model Secondary English School.",
  admissionsCtaText: "Contact for Admission",
  admissionsCtaLink: "/contact",
};

function Admissions() {
  const [page, setPage] = useState(defaultPage);

  useEffect(() => {
    const loadPage = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/page-content?slug=admissions`);
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

  return (
    <div>
      <PageHeader
        eyebrow={page.eyebrow || defaultPage.eyebrow}
        title={page.title || defaultPage.title}
        description={page.description || defaultPage.description}
      />
      <section className="py-24 text-center">
        <Container className="max-w-2xl">
          <h2 className="font-serif text-2xl font-bold text-navy">Interested in admission?</h2>
          <p className="mt-4 leading-7 text-gray-600">
            {page.admissionsIntro || defaultPage.admissionsIntro}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button to={page.admissionsCtaLink || "/contact"} variant="gold" showArrow>
              {page.admissionsCtaText || defaultPage.admissionsCtaText}
            </Button>
            <a
              href="https://www.facebook.com/61554117025008"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-navy px-6 py-3 font-semibold text-navy transition hover:bg-navy hover:text-white"
            >
              Message on Facebook
            </a>
          </div>
        </Container>
      </section>
    </div>
  );
}

export default Admissions;
