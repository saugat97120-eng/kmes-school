import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import { useSiteSettings } from "../context/useSiteSettings";

const defaultPage = {
  slug: "about",
  title: "",
  eyebrow: "About Us",
  description: "Learn about our school, history, leadership, mission, and vision.",
  history: "",
  mission:
    "To provide quality, values-based education that prepares every student for lifelong learning and responsible citizenship.",
  vision:
    "To be a leading institution recognized for academic excellence, character development, and community contribution.",
  principalMessage: "",
  directorMessage: "",
};

function About() {
  const { settings } = useSiteSettings();
  const [page, setPage] = useState(defaultPage);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPage = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/page-content?slug=about`);
        const data = await res.json();
        if (data?.success && data.data) {
          setPage({ ...defaultPage, ...data.data });
        }
      } catch (error) {
        console.error("Failed to load About page content", error);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, []);

  const schoolName = settings.schoolName || "Kaseni Model Secondary English School";
  const establishedYear = settings.establishedYear || "2059 B.S.";
  const dynamicHistory = `${schoolName} was established in ${establishedYear} according to the school's official seal.`;
  const dynamicPrincipalMessage = settings.principalMessage || "To be published once confirmed by the school administration.";
  const dynamicDirectorMessage = settings.directorMessage || "To be published once confirmed by the school administration.";

  return (
    <div>
      <PageHeader
        eyebrow={page.eyebrow || defaultPage.eyebrow}
        title={page.title || schoolName}
        description={page.description || defaultPage.description}
      />
      <section className="py-20">
        <Container className="max-w-4xl">
          {page.heroImage && (
            <img
              src={page.heroImage}
              alt={page.title || schoolName}
              className="mb-10 h-72 w-full rounded-2xl object-cover shadow-sm"
            />
          )}

          <h2 className="font-serif text-3xl font-bold text-navy">Our History</h2>
          <p className="mt-5 leading-8 text-gray-600">{page.history || dynamicHistory}</p>

          <h2 className="mt-14 font-serif text-3xl font-bold text-navy">Mission</h2>
          <p className="mt-5 leading-8 text-gray-600">{page.mission || defaultPage.mission}</p>

          <h2 className="mt-14 font-serif text-3xl font-bold text-navy">Vision</h2>
          <p className="mt-5 leading-8 text-gray-600">{page.vision || defaultPage.vision}</p>

          <h2 className="mt-14 font-serif text-3xl font-bold text-navy">Principal's Message</h2>
          <p className="mt-5 leading-8 text-gray-600">{page.principalMessage || dynamicPrincipalMessage}</p>

          <h2 className="mt-14 font-serif text-3xl font-bold text-navy">Director's Message</h2>
          <p className="mt-5 leading-8 text-gray-600">{page.directorMessage || dynamicDirectorMessage}</p>

          {loading && <p className="mt-6 text-sm text-gray-500">Loading page content...</p>}
        </Container>
      </section>
    </div>
  );
}

export default About;
