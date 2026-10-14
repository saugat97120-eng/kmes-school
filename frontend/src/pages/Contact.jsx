import { useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Container from "../components/common/Container";
import Button from "../components/common/Button";
import { MapPin, Phone, Mail, Share2, Clock } from "lucide-react";
import { useSiteSettings } from "../context/useSiteSettings";
import { API_BASE } from "../config";
import { isPlaceholder } from "../utils/format";

const FIELD_LIMITS = { name: 100, email: 254, phone: 30, subject: 200, message: 5000 };

function Contact() {
  const { settings } = useSiteSettings();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const [errorText, setErrorText] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === "sending") return; // block double-submit
    setStatus("sending");
    setErrorText("");
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = Array.isArray(data.errors) && data.errors[0]?.msg ? data.errors[0].msg : data.message;
        throw new Error(res.status === 429 || res.status === 400 ? detail || "Failed" : "Failed");
      }
      setStatus("sent");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      setErrorText(err.message && err.message !== "Failed" ? err.message : "");
      setStatus("error");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Contact" title="Contact Us" />
      <section className="py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="font-serif text-xl font-bold text-navy">School Information</h3>
              <div className="mt-6 flex flex-col gap-4 text-sm text-gray-600">
                {settings.address && (
                  <span className="flex items-center gap-3">
                    <MapPin size={18} className="text-gold shrink-0" /> {settings.address}
                  </span>
                )}
                {!isPlaceholder(settings.phone) && (
                  <span className="flex items-center gap-3">
                    <Phone size={18} className="text-gold shrink-0" /> {settings.phone}
                  </span>
                )}
                {!isPlaceholder(settings.email) && (
                  <span className="flex items-center gap-3">
                    <Mail size={18} className="text-gold shrink-0" /> {settings.email}
                  </span>
                )}
                {settings.workingHours && (
                  <span className="flex items-center gap-3">
                    <Clock size={18} className="text-gold shrink-0" /> {settings.workingHours}
                  </span>
                )}
                {settings.facebookUrl && (
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-gold"
                  >
                    <Share2 size={18} className="text-gold shrink-0" /> Facebook Page
                  </a>
                )}
              </div>
              <div className="mt-8 aspect-video overflow-hidden rounded-2xl bg-gray-100">
                <iframe
                  title="School location"
                  className="h-full w-full"
                  loading="lazy"
                  src="https://www.google.com/maps?q=26.593688,87.396257&z=17&output=embed"
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-navy">Send Message</h3>
              <input
                id="contact-name"
                required
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Name"
                aria-label="Name"
                maxLength={FIELD_LIMITS.name}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
              />
              <input
                id="contact-email"
                required
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
                aria-label="Email"
                maxLength={FIELD_LIMITS.email}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
              />
              <input
                id="contact-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Phone"
                aria-label="Phone"
                maxLength={FIELD_LIMITS.phone}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
              />
              <input
                id="contact-subject"
                required
                name="subject"
                value={form.subject}
                onChange={handleChange}
                placeholder="Subject"
                aria-label="Subject"
                maxLength={FIELD_LIMITS.subject}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
              />
              <textarea
                id="contact-message"
                required
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Message"
                aria-label="Message"
                maxLength={FIELD_LIMITS.message}
                rows={5}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
              />
              <Button type="submit" variant="primary" showArrow disabled={status === "sending"}>
                {status === "sending" ? "Sending..." : "Send Message"}
              </Button>
              {status === "sent" && (
                <p className="text-sm text-green-600">Message sent successfully.</p>
              )}
              {status === "error" && (
                <p className="text-sm text-red-600">
                  {errorText || "Could not send message. Please try again later."}
                </p>
              )}
            </form>
          </div>
        </Container>
      </section>
    </div>
  );
}

export default Contact;
