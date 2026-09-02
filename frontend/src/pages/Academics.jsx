import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";

const levels = [
  { title: "Early Childhood Development", range: "ECD / Nursery" },
  { title: "Basic Level", range: "Grade 1 - 8" },
  { title: "Secondary Level", range: "Grade 9 - 10" },
];

function Academics() {
  return (
    <div>
      <PageHeader
        eyebrow="Academics"
        title="Our Academic Programs"
        description="Nursery to Grade 10, taught fully in English under the national curriculum."
      />
      <section className="py-20">
        <Container>
          <div className="grid gap-6 sm:grid-cols-3">
            {levels.map((l) => (
              <div key={l.title} className="rounded-2xl border border-gray-200 p-7">
                <h3 className="font-serif text-xl font-bold text-navy">{l.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{l.range}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="font-serif text-xl font-bold text-navy">Medium of Instruction</h3>
              <p className="mt-3 leading-7 text-gray-600">English</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-navy">Curriculum</h3>
              <p className="mt-3 leading-7 text-gray-600">
                National Curriculum / SEE track
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
            Detailed subject lists, including optional Grade 9–10 subjects,
            will be published once confirmed by the school administration.
          </div>
        </Container>
      </section>
    </div>
  );
}

export default Academics;
