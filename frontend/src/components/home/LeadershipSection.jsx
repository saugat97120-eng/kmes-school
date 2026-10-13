import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import { useSiteSettings } from "../../context/useSiteSettings";

function LeadershipSection() {
  const { settings } = useSiteSettings();

  const principalInitial = (settings.principalName?.trim()?.slice(0, 1) || "P").toUpperCase();
  const directorInitial = (settings.directorName?.trim()?.slice(0, 1) || "D").toUpperCase();

  return (
    <section className="bg-bg-light py-20">
      <Container>
        <SectionHeading
          eyebrow="Leadership"
          title="Guided by Dedicated Leadership"
          description="Messages from the school's leadership are shared here and can be changed from the admin dashboard."
          centered
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Principal Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center gap-4">
              <div className="relative shrink-0">
                {settings.principalPhoto ? (
                  <img
                    src={settings.principalPhoto}
                    alt={settings.principalName || "Principal"}
                    className="h-20 w-20 rounded-full border-2 border-gold/40 object-cover shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={`h-20 w-20 items-center justify-center rounded-full bg-navy border-2 border-gold/40 text-xl font-bold text-gold shadow-sm ${
                    settings.principalPhoto ? "hidden" : "flex"
                  }`}
                >
                  {principalInitial}
                </div>
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-navy">
                  {settings.principalName || "Principal"}
                </h3>
                <p className="text-sm font-medium text-gray-500">
                  {settings.principalTitle || "Principal"}
                </p>
              </div>
            </div>
            <p className="leading-7 text-gray-700">
              {settings.principalMessage ||
                "Our school is committed to building confident learners, responsible citizens, and compassionate leaders through quality education and character development."}
            </p>
          </div>

          {/* Director Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center gap-4">
              <div className="relative shrink-0">
                {settings.directorPhoto ? (
                  <img
                    src={settings.directorPhoto}
                    alt={settings.directorName || "Director"}
                    className="h-20 w-20 rounded-full border-2 border-gold/40 object-cover shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={`h-20 w-20 items-center justify-center rounded-full bg-navy border-2 border-gold/40 text-xl font-bold text-gold shadow-sm ${
                    settings.directorPhoto ? "hidden" : "flex"
                  }`}
                >
                  {directorInitial}
                </div>
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-navy">
                  {settings.directorName || "Director"}
                </h3>
                <p className="text-sm font-medium text-gray-500">
                  {settings.directorTitle || "Director"}
                </p>
              </div>
            </div>
            <p className="leading-7 text-gray-700">
              {settings.directorMessage ||
                "We believe meaningful education blends academic excellence with discipline, creativity, and community spirit to prepare students for the future."}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

export default LeadershipSection;
