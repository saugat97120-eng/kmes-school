import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import { useSiteSettings } from "../../context/useSiteSettings";

function LeadershipSection() {
  const { settings } = useSiteSettings();

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
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-4">
              {settings.principalPhoto ? (
                <img src={settings.principalPhoto} alt={settings.principalName} className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-xl font-bold text-gold">
                  {settings.principalName?.slice(0, 1)?.toUpperCase() || "P"}
                </div>
              )}
              <div>
                <h3 className="font-serif text-2xl font-bold text-navy">{settings.principalName}</h3>
                <p className="text-sm font-medium text-gray-500">{settings.principalTitle}</p>
              </div>
            </div>
            <p className="leading-7 text-gray-700">{settings.principalMessage}</p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-4">
              {settings.directorPhoto ? (
                <img src={settings.directorPhoto} alt={settings.directorName} className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-xl font-bold text-gold">
                  {settings.directorName?.slice(0, 1)?.toUpperCase() || "D"}
                </div>
              )}
              <div>
                <h3 className="font-serif text-2xl font-bold text-navy">{settings.directorName}</h3>
                <p className="text-sm font-medium text-gray-500">{settings.directorTitle}</p>
              </div>
            </div>
            <p className="leading-7 text-gray-700">{settings.directorMessage}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

export default LeadershipSection;
