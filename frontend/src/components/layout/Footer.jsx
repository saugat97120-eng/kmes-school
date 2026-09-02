import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Share2 } from "lucide-react";

function Footer() {
  return (
    <footer className="bg-navy text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="font-serif text-xl font-bold text-white">
              Kaseni Model Secondary English School
            </span>
            <p className="mt-4 text-sm leading-6 text-gray-400">
              An academic institution committed to quality English-medium
              education from Nursery to Grade 10.
            </p>
          </div>

          <div>
            <h4 className="font-serif text-base font-bold text-white">Quick Links</h4>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link to="/about" className="hover:text-gold">About</Link>
              <Link to="/academics" className="hover:text-gold">Academics</Link>
              <Link to="/admissions" className="hover:text-gold">Admissions</Link>
              <Link to="/notices" className="hover:text-gold">Notices</Link>
              <Link to="/contact" className="hover:text-gold">Contact</Link>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-base font-bold text-white">Explore</h4>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link to="/facilities" className="hover:text-gold">Facilities</Link>
              <Link to="/activities" className="hover:text-gold">Activities</Link>
              <Link to="/gallery" className="hover:text-gold">Gallery</Link>
              <Link to="/achievements" className="hover:text-gold">Achievements</Link>
              <Link to="/events" className="hover:text-gold">Events</Link>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-base font-bold text-white">Contact Us</h4>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <span className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" /> Kaseni, Nepal
              </span>
              <span className="flex items-center gap-2">
                <Phone size={16} /> +977-9817361024
              </span>
              <span className="flex items-center gap-2">
                <Mail size={16} /> kmesbelbari@gmail.com
              </span>
              <a href="https://www.facebook.com/61554117025008" className="flex items-center gap-2 hover:text-gold">
                <Share2 size={16} /> Facebook Page
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Kaseni Model Secondary English School. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
