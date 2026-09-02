import Container from "../common/Container";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";

function AboutSection() {
  return (
    <section className="py-20">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="About Our School"
              title="A Trusted Name in Quality Education"
              description="Kaseni Model English School was established in 2059 B.S. according to the school's official seal. Additional historical information will be published after confirmation from the school administration."
            />
            <div className="mt-6">
              <Button to="/about" variant="outline" showArrow>
                Read Our Story
              </Button>
            </div>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
            <img
              src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&q=80"
              alt="School campus"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

export default AboutSection;
