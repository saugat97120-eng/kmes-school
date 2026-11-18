import HeroSection from "../components/home/HeroSection";
import ClassDeckHub from "../components/home/ClassDeckHub";
import QuickFacts from "../components/home/QuickFacts";
import AboutSection from "../components/home/AboutSection";
import LeadershipSection from "../components/home/LeadershipSection";
import AcademicSection from "../components/home/AcademicSection";
import MissionVisionSection from "../components/home/MissionVisionSection";
import ValuesSection from "../components/home/ValuesSection";
import FacilitiesSection from "../components/home/FacilitiesSection";
import ActivitiesSection from "../components/home/ActivitiesSection";
import NoticeBoard from "../components/home/NoticeBoard";
import EventsSection from "../components/home/EventsSection";
import GallerySection from "../components/home/GallerySection";
import AchievementsSection from "../components/home/AchievementsSection";
import AdmissionSection from "../components/home/AdmissionSection";
import ContactSection from "../components/home/ContactSection";
import { useIStudent } from "../context/useIStudent";

export default function Home() {
  const { openPortal } = useIStudent();

  return (
    <main className="min-h-screen bg-slate-50/30">
      <HeroSection />
      <ClassDeckHub onOpenPortal={openPortal} />
      <QuickFacts />
      <NoticeBoard />
      <AcademicSection />
      <AboutSection />
      <LeadershipSection />
      <EventsSection />
      <MissionVisionSection />
      <ValuesSection />
      <FacilitiesSection />
      <ActivitiesSection />
      <GallerySection />
      <AchievementsSection />
      <AdmissionSection />
      <ContactSection />
    </main>
  );
}
