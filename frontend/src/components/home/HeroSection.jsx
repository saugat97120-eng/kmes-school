import Container from "../common/Container";
import Button from "../common/Button";
import { useSiteSettings } from "../../context/useSiteSettings";

function HeroSection() {
  const { settings } = useSiteSettings();

  return (
    <section className="relative overflow-hidden bg-navy py-24 text-white sm:py-32">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage: `url('${settings.heroImage || "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80"}')`,
        }}
      />
      <Container className="relative">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
          {settings.heroEyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
          {settings.heroTitle}
        </h1>
        <p className="mt-6 max-w-2xl leading-7 text-gray-300">
          {settings.heroDescription}
        </p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Button to="/admissions" variant="gold" showArrow>
            Apply for Admission
          </Button>
          <Button to="/about" variant="light">
            Learn More
          </Button>
        </div>
      </Container>
    </section>
  );
}

export default HeroSection;
