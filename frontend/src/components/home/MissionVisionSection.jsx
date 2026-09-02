import Container from "../common/Container";
import { Target, Eye } from "lucide-react";

function MissionVisionSection() {
  return (
    <section className="bg-navy py-20 text-white">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <Target className="text-gold" size={30} />
            <h3 className="mt-4 font-serif text-2xl font-bold">Our Mission</h3>
            <p className="mt-3 leading-7 text-gray-300">
              To provide quality, values-based education that prepares every
              student for lifelong learning and responsible citizenship.
            </p>
          </div>
          <div>
            <Eye className="text-gold" size={30} />
            <h3 className="mt-4 font-serif text-2xl font-bold">Our Vision</h3>
            <p className="mt-3 leading-7 text-gray-300">
              To be a leading institution recognized for academic excellence,
              character development, and community contribution.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

export default MissionVisionSection;
