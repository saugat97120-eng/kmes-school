import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import { MapPin, Phone, Mail } from "lucide-react";
import { useSiteSettings } from "../../context/useSiteSettings";
import { isPlaceholder } from "../../utils/format";

function ContactSection() {
  const { settings } = useSiteSettings();

  return (
    <section className="py-20">
      <Container>
        <SectionHeading eyebrow="Contact" title="Get in Touch" centered />
        <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-3">
          <div className="text-center">
            <MapPin className="mx-auto text-gold" />
            <p className="mt-2 text-sm text-gray-600">{settings.address}</p>
          </div>
          {!isPlaceholder(settings.phone) && (
            <div className="text-center">
              <Phone className="mx-auto text-gold" />
              <p className="mt-2 text-sm text-gray-600">{settings.phone}</p>
            </div>
          )}
          {!isPlaceholder(settings.email) && (
            <div className="text-center">
              <Mail className="mx-auto text-gold" />
              <p className="mt-2 text-sm text-gray-600">{settings.email}</p>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

export default ContactSection;
