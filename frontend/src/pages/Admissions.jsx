import { useEffect, useState } from "react";
import { API_BASE } from "../config";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import { useSiteSettings } from "../context/useSiteSettings";
import {
  Calendar,
  CheckCircle2,
  FileText,
  CreditCard,
  Send,
  Printer,
  Sparkles,
} from "lucide-react";

const defaultPage = {
  slug: "admissions",
  title: "Admissions & Enrollment",
  eyebrow: "Join Our Family",
  description:
    "Comprehensive admission guidelines, required documents, fee guidance, and digital application inquiry for KMES.",
  admissionsIntro: "",
  admissionsCtaText: "Contact for Admission",
  admissionsCtaLink: "/contact",
};

const GRADE_OPTIONS = [
  "Playgroup / Nursery",
  "Lower Kindergarten (LKG)",
  "Upper Kindergarten (UKG)",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8 (BLE Preparation)",
  "Grade 9",
  "Grade 10 (SEE Preparation)",
];

function Admissions() {
  const { settings } = useSiteSettings();
  const [page, setPage] = useState(defaultPage);

  // Form State
  const [formData, setFormData] = useState({
    studentName: "",
    gender: "Male",
    grade: "Grade 1",
    parentName: "",
    phone: "",
    address: "",
    previousSchool: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedSlip, setSubmittedSlip] = useState(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let ignore = false;
    fetch(`${API_BASE}/api/page-content?slug=admissions`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data?.success && data.data) {
          setPage({ ...defaultPage, ...data.data });
        }
      })
      .catch((error) => {
        console.error("Failed to load Admissions page content", error);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const schoolName = settings.schoolName || "Kaseni Model Secondary English School";
  const defaultIntro = `We warmly welcome prospective students and parents to Kaseni Model Secondary English School. Our admissions process is designed to be transparent, friendly, and supportive for every family.`;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitInquiry = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.studentName.trim() || !formData.parentName.trim() || !formData.phone.trim()) {
      setFormError("Please fill in Student Name, Parent Name, and Contact Number.");
      return;
    }

    setSubmitting(true);
    const trackingId = `KMES-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const messagePayload = {
        name: formData.parentName,
        email: "admissions@kmes.edu.np",
        phone: formData.phone,
        subject: `[ADMISSION INQUIRY] ${formData.grade} - ${formData.studentName}`,
        message: `Student: ${formData.studentName} (${formData.gender})\nApplying for: ${formData.grade}\nParent/Guardian: ${formData.parentName}\nPhone: ${formData.phone}\nAddress: ${formData.address || "Kaseni"}\nPrevious School: ${formData.previousSchool || "N/A"}\nTracking ID: ${trackingId}`,
      };

      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messagePayload),
      });

      if (!res.ok) {
        throw new Error("Unable to submit application inquiry. Please contact the school directly.");
      }

      setSubmittedSlip({
        trackingId,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        ...formData,
      });
    } catch (err) {
      setFormError(err.message || "Failed to submit. Please try calling the school office directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={page.eyebrow || defaultPage.eyebrow}
        title={page.title || defaultPage.title}
        description={page.description || defaultPage.description}
      />

      <section className="py-16 bg-white">
        <Container>
          {/* Status & Academic Session Banner */}
          {(settings.academicSession || settings.admissionsStatus) && (
            <div className="mb-14 grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-4 rounded-2xl border border-gold/30 bg-gold/5 p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold text-white shadow-sm">
                  <Calendar size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-navy-2">
                    Current Academic Session (शैक्षिक सत्र)
                  </div>
                  <p className="mt-1 font-serif text-2xl font-bold text-navy">
                    {settings.academicSession || "2081 / 2082 B.S."}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Admissions running from Baishakh to Chaitra</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-green-200 bg-green-50/70 p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-green-800">
                    Admission Status (भर्ना स्थिति)
                  </div>
                  <p className="mt-1 font-serif text-2xl font-bold text-green-950">
                    {settings.admissionsStatus || "Open for Nursery to Grade 10"}
                  </p>
                  <p className="mt-1 text-xs text-green-700">Limited seats available per classroom</p>
                </div>
              </div>
            </div>
          )}

          {/* 4-Step Admission Process */}
          <div className="mb-20">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-gold">Simple 4-Step Process</span>
              <h2 className="mt-2 font-serif text-3xl font-bold text-navy">How to Enroll at KMES</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600">
                {page.admissionsIntro || defaultIntro}
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 transition-all hover:shadow-md">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                  1
                </span>
                <h3 className="mt-4 font-serif text-lg font-bold text-navy">Online / In-Person Inquiry</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  Fill out our online inquiry form below or visit the school reception desk in Kaseni.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 transition-all hover:shadow-md">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-xs font-bold text-white">
                  2
                </span>
                <h3 className="mt-4 font-serif text-lg font-bold text-navy">Counseling & Assessment</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  A friendly, age-appropriate assessment and parental interaction with faculty.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 transition-all hover:shadow-md">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                  3
                </span>
                <h3 className="mt-4 font-serif text-lg font-bold text-navy">Document Verification</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  Submit birth certificate, previous grade marksheet, and passport photographs.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 transition-all hover:shadow-md">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                  4
                </span>
                <h3 className="mt-4 font-serif text-lg font-bold text-navy">Final Enrollment</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  Receive the official school uniform guide, booklist, and student identity card.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Online Admission Inquiry & Printable Slip */}
          <div className="mb-20 grid gap-10 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
                <Sparkles size={16} /> Online Enrollment Inquiry
              </div>
              <h3 className="mt-1 font-serif text-2xl font-bold text-navy">Submit Student Details</h3>
              <p className="mt-1 text-xs text-gray-500">
                Submit this form to reserve your seat and receive an official KMES tracking voucher.
              </p>

              {formError && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  {formError}
                </div>
              )}

              {submittedSlip ? (
                <div className="mt-6 rounded-xl border-2 border-dashed border-green-500 bg-green-50/50 p-6">
                  <div className="flex items-center justify-between border-b border-green-200 pb-4">
                    <div>
                      <span className="rounded bg-green-600 px-2.5 py-1 text-xs font-bold uppercase text-white">
                        Voucher Generated
                      </span>
                      <h4 className="mt-2 font-serif text-lg font-bold text-green-950">
                        {schoolName}
                      </h4>
                      <p className="text-xs text-green-800">Admission Inquiry Slip — {submittedSlip.trackingId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 rounded-lg border border-green-600 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 shadow-sm transition hover:bg-green-50"
                    >
                      <Printer size={14} /> Print Slip
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">Student:</span>
                      <p className="font-bold text-gray-900">{submittedSlip.studentName} ({submittedSlip.gender})</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Target Class:</span>
                      <p className="font-bold text-gray-900">{submittedSlip.grade}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Parent / Guardian:</span>
                      <p className="font-bold text-gray-900">{submittedSlip.parentName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone Contact:</span>
                      <p className="font-bold text-gray-900">{submittedSlip.phone}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Submission Date:</span>
                      <p className="font-bold text-gray-900">{submittedSlip.date}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <p className="font-bold text-green-700">Pending Office Verification</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-lg bg-white p-3 text-xs text-gray-600 border border-green-100">
                    <p className="font-semibold text-gray-900">Next Step:</p>
                    Please visit the school administration office with this tracking reference or call{" "}
                    <strong>{settings.phone || "+977-9800000000"}</strong> to confirm counseling.
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedSlip(null);
                      setFormData({
                        studentName: "",
                        gender: "Male",
                        grade: "Grade 1",
                        parentName: "",
                        phone: "",
                        address: "",
                        previousSchool: "",
                      });
                    }}
                    className="mt-4 text-xs font-semibold text-navy hover:underline"
                  >
                    ← Submit another student inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitInquiry} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="studentName" className="block text-xs font-semibold text-gray-700">
                        Student Full Name *
                      </label>
                      <input
                        id="studentName"
                        name="studentName"
                        type="text"
                        required
                        value={formData.studentName}
                        onChange={handleInputChange}
                        placeholder="e.g. Aarav Sharma"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      />
                    </div>

                    <div>
                      <label htmlFor="gender" className="block text-xs font-semibold text-gray-700">
                        Gender
                      </label>
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="grade" className="block text-xs font-semibold text-gray-700">
                      Target Grade / Class to Enroll *
                    </label>
                    <select
                      id="grade"
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="parentName" className="block text-xs font-semibold text-gray-700">
                        Parent / Guardian Name *
                      </label>
                      <input
                        id="parentName"
                        name="parentName"
                        type="text"
                        required
                        value={formData.parentName}
                        onChange={handleInputChange}
                        placeholder="e.g. Ramesh Sharma"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-xs font-semibold text-gray-700">
                        Contact Number (Mobile) *
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="e.g. +977-98XXXXXXXX"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="address" className="block text-xs font-semibold text-gray-700">
                        Residential Address / Village
                      </label>
                      <input
                        id="address"
                        name="address"
                        type="text"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="e.g. Kaseni, Palpa / Rupandehi"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      />
                    </div>

                    <div>
                      <label htmlFor="previousSchool" className="block text-xs font-semibold text-gray-700">
                        Previous School (if transferring)
                      </label>
                      <input
                        id="previousSchool"
                        name="previousSchool"
                        type="text"
                        value={formData.previousSchool}
                        onChange={handleInputChange}
                        placeholder="Previous School Name"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-gold-light disabled:opacity-50"
                    >
                      <Send size={16} />
                      {submitting ? "Submitting Inquiry..." : "Submit Inquiry & Generate Slip"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Checklist of Required Documents */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy">
                  <FileText size={18} className="text-gold" /> Required Documents (कागजातहरू)
                </div>
                <h4 className="mt-2 font-serif text-lg font-bold text-navy">Checklist for Admission</h4>
                <ul className="mt-4 space-y-3 text-xs text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-green-600 mt-0.5" />
                    <span>Copy of official Government Birth Certificate (जन्मदर्ता प्रमाणपत्र).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-green-600 mt-0.5" />
                    <span>Recent passport-size photographs of student (4 copies).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-green-600 mt-0.5" />
                    <span>Transfer Certificate (TC) & Character Certificate from previous institution.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-green-600 mt-0.5" />
                    <span>Copy of final academic progress report / marksheet of previous grade.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-green-600 mt-0.5" />
                    <span>Copy of Citizenship / National Identity Card of parents/guardians.</span>
                  </li>
                </ul>
              </div>

              {/* Fee & Payment Guide */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy">
                  <CreditCard size={18} className="text-gold" /> Fee & Payment Options
                </div>
                <h4 className="mt-2 font-serif text-lg font-bold text-navy">Transparent Fee Structure</h4>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  KMES maintains an affordable, highly competitive fee structure to ensure quality English-medium education is accessible.
                </p>
                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700 space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Direct Bank Deposit:</span>
                    <span className="font-bold text-navy">School Office Account</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Mobile Banking:</span>
                    <span className="font-bold text-navy">Fonepay / eSewa QR</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Office Counter:</span>
                    <span className="font-bold text-navy">Cash / Cheque Accepted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

export default Admissions;
