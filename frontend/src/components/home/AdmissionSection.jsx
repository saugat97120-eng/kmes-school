import Container from "../common/Container";
import Button from "../common/Button";
import { useSiteSettings } from "../../context/useSiteSettings";

function AdmissionSection() {
  const { settings } = useSiteSettings();
  const schoolName = settings.schoolName || "Kaseni Model Secondary English School";

  return (
    <section className="bg-navy py-20 text-center text-white">
      <Container>
        <h2 className="font-serif text-3xl font-bold sm:text-4xl">
          Interested in Admission?
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-gray-300">
          {settings.admissionsStatus ? (
            <>
              Admissions are currently <span className="text-gold font-semibold">{settings.admissionsStatus}</span>
              {settings.academicSession ? ` for the ${settings.academicSession} academic session.` : "."} Please contact {schoolName}.
            </>
          ) : (
            `For current admission availability and information, please contact ${schoolName}.`
          )}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button to="/contact" variant="gold" showArrow>
            Contact for Admission
          </Button>
          {settings.facebookUrl && (
            <a
              href={settings.facebookUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-navy"
            >
              Message on Facebook
            </a>
          )}
        </div>
      </Container>
    </section>
  );
}

export default AdmissionSection;
