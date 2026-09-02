import Container from "../common/Container";
import Button from "../common/Button";

function AdmissionSection() {
  return (
    <section className="bg-navy py-20 text-center text-white">
      <Container>
        <h2 className="font-serif text-3xl font-bold sm:text-4xl">
          Interested in Admission?
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-gray-300">
          For current admission availability and information, please contact
          Kaseni Model Secondary English School.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button to="/contact" variant="gold" showArrow>
            Contact for Admission
          </Button>
          <Button to="#" variant="light">
            Message on Facebook
          </Button>
        </div>
      </Container>
    </section>
  );
}

export default AdmissionSection;
