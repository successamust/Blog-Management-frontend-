import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { 
  Github, 
  Linkedin, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink,
  Calendar,
  GraduationCap,
  Award,
  Briefcase,
  ArrowDown,
  CheckCircle2,
  Code2,
  Rocket,
  TrendingUp,
  FileText,
  Download,
  Zap,
  Shield,
  Database,
  Server,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { 
  SiNodedotjs, 
  SiExpress, 
  SiMongodb, 
  SiPostgresql, 
  SiMysql, 
  SiRedis,
  SiJavascript,
  SiJest,
  SiDocker,
  SiGit,
  SiPostman,
  SiWhatsapp
} from 'react-icons/si';
import Seo from '../components/common/Seo';

const Portfolio = () => {
  const { scrollYProgress } = useScroll();
  const heroRef = useRef(null);
  const skillsRef = useRef(null);
  const projectsRef = useRef(null);
  const experienceRef = useRef(null);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [mousePosition, setMousePosition] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, 
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 
  });
  const [imageError, setImageError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [orbSize, setOrbSize] = useState(400);
  const [orbOffset, setOrbOffset] = useState(200);
  
  useEffect(() => {
    // Initialize mouse position to center of screen
    const initPosition = () => {
      setMousePosition({ 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2 
      });
    };
    initPosition();
    
    // Handle window resize and update orb size
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setOrbSize(400);
        setOrbOffset(200);
      } else if (width < 1024) {
        setOrbSize(600);
        setOrbOffset(300);
      } else {
        setOrbSize(800);
        setOrbOffset(400);
      }
      
      setMousePosition(prev => ({
        x: Math.min(prev.x, window.innerWidth),
        y: Math.min(prev.y, window.innerHeight)
      }));
    };
    
    handleResize(); // Initial calculation
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const heroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const skillsInView = useInView(skillsRef, { once: true, amount: 0.2 });
  const projectsInView = useInView(projectsRef, { once: true, amount: 0.2 });
  const experienceInView = useInView(experienceRef, { once: true, amount: 0.2 });

  const techStack = [
    { name: 'Node.js', icon: SiNodedotjs, color: 'text-[#339933]' },
    { name: 'Express.js', icon: SiExpress, color: 'text-gray-800 dark:text-gray-200' },
    { name: 'MongoDB', icon: SiMongodb, color: 'text-[#47A248]' },
    { name: 'PostgreSQL', icon: SiPostgresql, color: 'text-[#336791]' },
    { name: 'MySQL', icon: SiMysql, color: 'text-[#4479A1]' },
    { name: 'Redis', icon: SiRedis, color: 'text-[#DC382D]' },
    { name: 'JavaScript', icon: SiJavascript, color: 'text-[#F7DF1E]' },
    { name: 'Jest', icon: SiJest, color: 'text-[#C21325]' },
    { name: 'Docker', icon: SiDocker, color: 'text-[#2496ED]' },
    { name: 'Git', icon: SiGit, color: 'text-[#F05032]' },
    { name: 'Postman', icon: SiPostman, color: 'text-[#FF6C37]' },
    { name: 'Paystack', icon: Code2, color: 'text-[#00B9F5]' },
  ];

  const projects = [
    {
      name: 'Nexus Blog',
      description: 'A modern blog and newsletter PWA with full backend API, authentication, newsletter management, and real-time features. Complete full-stack solution with optimized performance.',
      tech: ['Node.js', 'Express.js', 'MongoDB', 'JWT', 'React', 'Vite'],
      github: 'https://github.com/successamust/Blog-Management',
      live: 'https://nexusblog.xyz',
      featured: true,
      highlights: ['RESTful API', 'Authentication', 'Newsletter System', 'Real-time Updates']
    },
    {
      name: 'Blog Management Frontend',
      description: 'React-based frontend with modern UI/UX, dark mode, PWA support, and seamless API integration. Part of the Nexus Blog ecosystem.',
      tech: ['React', 'Vite', 'Tailwind CSS', 'Framer Motion', 'React Query'],
      github: 'https://github.com/successamust/Blog-Management-frontend-',
      live: 'https://nexusblog.xyz',
      featured: true,
      highlights: ['PWA', 'Dark Mode', 'Responsive Design', 'Performance Optimized']
    },
    {
      name: 'RideSync',
      description: 'Transportation booking API with integrated payment services, real-time tracking, and event scheduling. Scalable backend solution for transportation management.',
      tech: ['Node.js', 'Express.js', 'MongoDB', 'Paystack', 'WebSockets'],
      github: 'https://github.com/successamust/RideSync',
      featured: true,
      highlights: ['Payment Integration', 'Real-time Tracking', 'Booking System', 'Event Scheduling']
    }
  ];

  const experiences = [
    {
      role: 'Backend Engineer',
      company: 'Everything Mobile Tech-Hub Ltd',
      location: 'Lagos, Nigeria',
      period: 'May 2025 – Present',
      type: 'Remote',
      achievements: [
        'Built resilient RESTful APIs serving thousands of users',
        'Optimized database queries, achieving 50% improvement in API response time',
        'Architected microservices for enhanced scalability',
        'Implemented secure authentication with JWT & OAuth2',
        'Integrated payment gateways and wallet systems',
        'Mentored junior developers and maintained code quality standards'
      ]
    }
  ];

  const phoneNumber = '+2348167775155';
  const whatsappLink = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}`;
  const telLink = `tel:${phoneNumber}`;
  const cvLink = 'https://drive.google.com/file/d/1TqjYrDJTLyLBcrVILUlJiWRVt618AmMZ/view?usp=sharing';

  const nextProject = () => {
    setCurrentProjectIndex((prev) => (prev + 1) % projects.length);
  };

  const prevProject = () => {
    setCurrentProjectIndex((prev) => (prev - 1 + projects.length) % projects.length);
  };

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        setCurrentProjectIndex((prev) => (prev - 1 + projects.length) % projects.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentProjectIndex((prev) => (prev + 1) % projects.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projects.length]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Seo 
        title="Fatai Salami - Backend Engineer"
        description="Backend Engineer specializing in Node.js, Express.js, MongoDB, and microservices. Building scalable APIs and robust backend systems."
      />
      <div 
        className="min-h-screen bg-page relative overflow-hidden"
        onMouseMove={(e) => {
          const { clientX, clientY } = e;
          setMousePosition({ x: clientX, y: clientY });
        }}
        onMouseLeave={() => {
          // Reset to center when mouse leaves
          setMousePosition({ 
            x: window.innerWidth / 2, 
            y: window.innerHeight / 2 
          });
        }}
        onTouchMove={(e) => {
          // Support touch for mobile devices
          const touch = e.touches[0];
          if (touch) {
            setMousePosition({ x: touch.clientX, y: touch.clientY });
          }
        }}
      >
        {/* Background Design */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Single Gradient Orb - Mouse Interactive (Light theme) */}
          <motion.div 
            className="absolute rounded-full"
            style={{
              width: `${orbSize}px`,
              height: `${orbSize}px`,
              background: 'radial-gradient(circle, rgba(26, 137, 23, 0.12) 0%, rgba(26, 137, 23, 0.04) 40%, transparent 70%)',
              filter: 'blur(100px)',
              willChange: 'transform',
              transform: `translate(${mousePosition.x - orbOffset}px, ${mousePosition.y - orbOffset}px)`,
            }}
          ></motion.div>
          
          {/* Single Gradient Orb - Mouse Interactive (Dark theme) */}
          <motion.div 
            className="dark:block hidden absolute rounded-full"
            style={{
              width: `${orbSize}px`,
              height: `${orbSize}px`,
              background: 'radial-gradient(circle, rgba(74, 222, 128, 0.12) 0%, rgba(74, 222, 128, 0.04) 40%, transparent 70%)',
              filter: 'blur(100px)',
              willChange: 'transform',
              transform: `translate(${mousePosition.x - orbOffset}px, ${mousePosition.y - orbOffset}px)`,
            }}
          ></motion.div>
        </div>
        
        {/* Header Navigation */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-page/80 backdrop-blur-md h-16">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--border-subtle)]"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
            <div className="flex items-center justify-end h-full">
              <nav className="hidden md:flex items-center gap-6 lg:gap-8">
                <button
                  onClick={() => scrollToSection('projects')}
                  className="text-text-secondary hover:text-[var(--accent)] transition-colors font-medium relative group text-sm lg:text-base"
                >
                  Projects
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--accent)] group-hover:w-full transition-all duration-300"></span>
                </button>
                <button
                  onClick={() => scrollToSection('about')}
                  className="text-text-secondary hover:text-[var(--accent)] transition-colors font-medium relative group text-sm lg:text-base"
                >
                  About
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--accent)] group-hover:w-full transition-all duration-300"></span>
                </button>
                <button
                  onClick={() => scrollToSection('experience')}
                  className="text-text-secondary hover:text-[var(--accent)] transition-colors font-medium relative group text-sm lg:text-base"
                >
                  Experience
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--accent)] group-hover:w-full transition-all duration-300"></span>
                </button>
                <button
                  onClick={() => scrollToSection('contact')}
                  className="text-text-secondary hover:text-[var(--accent)] transition-colors font-medium relative group text-sm lg:text-base"
                >
                  Contact
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--accent)] group-hover:w-full transition-all duration-300"></span>
                </button>
              </nav>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-text-secondary hover:text-[var(--accent)] transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden absolute top-16 left-0 right-0 bg-page/95 backdrop-blur-md border-b border-[var(--border-subtle)]"
            >
              <nav className="flex flex-col py-4">
                <button
                  onClick={() => {
                    scrollToSection('projects');
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-6 py-3 text-left text-text-secondary hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors font-medium"
                >
                  Projects
                </button>
                <button
                  onClick={() => {
                    scrollToSection('about');
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-6 py-3 text-left text-text-secondary hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors font-medium"
                >
                  About
                </button>
                <button
                  onClick={() => {
                    scrollToSection('experience');
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-6 py-3 text-left text-text-secondary hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors font-medium"
                >
                  Experience
                </button>
                <button
                  onClick={() => {
                    scrollToSection('contact');
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-6 py-3 text-left text-text-secondary hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors font-medium"
                >
                  Contact
                </button>
              </nav>
            </motion.div>
          )}
        </header>

        {/* Hero Section */}
        <section 
          ref={heroRef}
          className="relative pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-20 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center"
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Left: Text Content */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6 }}
                className="space-y-4 sm:space-y-6 order-2 lg:order-1"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-text-primary leading-tight">
                  <span className="block sm:whitespace-nowrap">Hi, I'm <span className="text-[var(--accent)]">Fatai Salami</span></span>
                </h1>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-text-secondary leading-relaxed">
                  A backend engineer, specialized in building scalable and efficient backend systems.
                </p>
                <div className="flex items-center gap-2 text-text-secondary text-base sm:text-lg">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] flex-shrink-0" />
                  <span>Lagos, Nigeria</span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 sm:pt-4">
                  <motion.a
                    href={cvLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 sm:px-6 sm:py-3 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-semibold shadow-lg shadow-[var(--accent)]/30 flex items-center gap-2 text-sm sm:text-base min-h-[44px]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                    Resume
                  </motion.a>
                  
                  <div className="flex gap-2 sm:gap-3">
                    <motion.a
                      href="https://www.github.com/successamust"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-surface-bg border border-border-subtle flex items-center justify-center hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all shadow-lg group hover:shadow-[var(--accent)]/30 min-h-[44px] min-w-[44px]"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Github className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary group-hover:text-white transition-colors" />
                    </motion.a>
                    <motion.a
                      href="https://www.linkedin.com/in/fataiopeyemi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-surface-bg border border-border-subtle flex items-center justify-center hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all shadow-lg group hover:shadow-[var(--accent)]/30 min-h-[44px] min-w-[44px]"
                      whileHover={{ scale: 1.1, rotate: -5 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Linkedin className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary group-hover:text-white transition-colors" />
                    </motion.a>
                    <motion.a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-surface-bg border border-border-subtle flex items-center justify-center hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all shadow-lg group hover:shadow-[var(--accent)]/30 min-h-[44px] min-w-[44px]"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <SiWhatsapp className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary group-hover:text-white transition-colors" />
                    </motion.a>
                    <motion.a
                      href="mailto:fosalami1@gmail.com?subject=Portfolio%20Inquiry"
                      aria-label="Send email to Fatai Salami"
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-surface-bg border border-border-subtle flex items-center justify-center hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all shadow-lg group hover:shadow-[var(--accent)]/30 min-h-[44px] min-w-[44px]"
                      whileHover={{ scale: 1.1, rotate: -5 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary group-hover:text-white transition-colors" />
                    </motion.a>
                  </div>
                </div>
              </motion.div>

              {/* Right: Profile Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex justify-center lg:justify-end order-1 lg:order-2 mb-6 lg:mb-0"
              >
                <div className="relative">
                  <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full overflow-hidden shadow-2xl ring-4 ring-[var(--accent)]/20">
                    {!imageError ? (
                      <img 
                        src="/profile-photo.jpg" 
                        alt="Fatai Salami"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[var(--accent)]/30 via-[var(--accent)]/20 to-[var(--accent)]/10 flex items-center justify-center">
                        <div className="text-4xl sm:text-6xl md:text-8xl font-bold text-[var(--accent)] opacity-60">
                          FS
                        </div>
                      </div>
                    )}
                  </div>
                  <motion.div
                    className="absolute -bottom-2 -right-2 sm:-bottom-4 sm:-right-4 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-[var(--accent)] rounded-full flex items-center justify-center shadow-xl"
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    <Code2 className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* About Me Section */}
        <section id="about" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-content-bg">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="h-1 w-8 sm:w-12 bg-[var(--accent)] rounded-full"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--accent)] uppercase tracking-wide">About Me</h2>
              </div>
              <div className="space-y-3 sm:space-y-4 text-text-secondary text-base sm:text-lg leading-relaxed">
                <p>
                  Backend Engineer with hands-on experience building scalable RESTful APIs using Node.js, Express.js, 
                  and MongoDB. I specialize in designing robust backend systems, optimizing database performance, and 
                  implementing secure authentication systems.
                </p>
                <p>
                  Currently working on production-grade applications serving thousands of users, with a focus on 
                  microservices architecture, API optimization, and system scalability. Always exploring new technologies 
                  to enhance my backend engineering skills.
                </p>
                <p>
                  Passionate about building efficient systems, solving complex problems, and contributing to open-source 
                  projects. I enjoy working with development teams and mentoring junior developers to help them grow.
                </p>
              </div>
              <motion.button
                onClick={() => scrollToSection('skills')}
                className="mt-6 flex items-center gap-2 text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-semibold group"
                whileHover={{ x: 5 }}
              >
                <span>View more</span>
                <ArrowDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
              </motion.button>
            </motion.div>
          </div>
        </section>

        {/* Recent Projects Section */}
        <section id="projects" ref={projectsRef} className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={projectsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-8 sm:mb-12"
            >
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
                <div className="h-1 w-6 sm:w-12 bg-[var(--accent)] rounded-full"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--accent)] uppercase tracking-wide">Recent Projects</h2>
                <div className="h-1 w-6 sm:w-12 bg-[var(--accent)] rounded-full"></div>
              </div>
            </motion.div>

            <div className="relative">
              {/* Project Carousel */}
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-surface-bg shadow-xl border border-border-subtle min-h-[400px] sm:min-h-[500px]">
                <AnimatePresence mode="wait" custom={currentProjectIndex}>
                  <motion.div
                    key={currentProjectIndex}
                    custom={currentProjectIndex}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ 
                      duration: 0.5,
                      ease: [0.25, 0.1, 0.25, 1]
                    }}
                    className="p-4 sm:p-6 md:p-8 lg:p-12"
                  >
                    <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
                      {/* Project Info */}
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3 sm:mb-4">
                          {projects[currentProjectIndex].name}
                        </h3>
                        <p className="text-text-secondary leading-relaxed mb-4 sm:mb-6 text-base sm:text-lg">
                          {projects[currentProjectIndex].description}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                          {projects[currentProjectIndex].tech.map(tech => (
                            <span
                              key={tech}
                              className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-[var(--accent-soft)] text-[var(--accent)] rounded-lg font-medium hover:bg-[var(--accent)] hover:text-white transition-all cursor-default"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <motion.a
                            href={projects[currentProjectIndex].github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-surface-subtle text-text-secondary rounded-lg hover:bg-[var(--accent)] hover:text-white transition-all font-semibold text-sm sm:text-base min-h-[44px]"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Github className="w-4 h-4 sm:w-5 sm:h-5" />
                            View Code
                          </motion.a>
                          {projects[currentProjectIndex].live && (
                            <motion.a
                              href={projects[currentProjectIndex].live}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-semibold shadow-lg text-sm sm:text-base min-h-[44px]"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                              Visit Site
                            </motion.a>
                          )}
                        </div>
                      </div>
                      
                      {/* Project Highlights */}
                      <div className="space-y-3 sm:space-y-4">
                        <h4 className="text-base sm:text-lg font-semibold text-text-primary mb-3 sm:mb-4">Key Features</h4>
                        {projects[currentProjectIndex].highlights.map((feature, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center gap-3 p-3 sm:p-4 bg-surface-subtle rounded-lg hover:bg-[var(--accent-soft)] transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] flex-shrink-0" />
                            <span className="text-text-secondary text-sm sm:text-base">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={prevProject}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface-bg border border-border-subtle flex items-center justify-center hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all shadow-lg z-10 group min-h-[44px] min-w-[44px]"
                aria-label="Previous project"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary group-hover:text-white transition-colors" />
              </button>
              <button
                onClick={nextProject}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface-bg border border-border-subtle flex items-center justify-center hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all shadow-lg z-10 group min-h-[44px] min-w-[44px]"
                aria-label="Next project"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-text-secondary group-hover:text-white transition-colors" />
              </button>

              {/* Project Indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {projects.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentProjectIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentProjectIndex ? 'bg-[var(--accent)] w-8' : 'bg-border-subtle hover:bg-[var(--accent)]/50'
                    }`}
                    aria-label={`Go to project ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Technologies Section */}
        <section id="skills" ref={skillsRef} className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-content-bg">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={skillsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-8 sm:mb-12"
            >
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
                <div className="h-1 w-6 sm:w-12 bg-[var(--accent)] rounded-full"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--accent)] uppercase tracking-wide">Technologies</h2>
                <div className="h-1 w-6 sm:w-12 bg-[var(--accent)] rounded-full"></div>
              </div>
            </motion.div>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8">
              {techStack.map((tech, index) => {
                const Icon = tech.icon;
                return (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={skillsInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                    whileHover={{ scale: 1.15, y: -5 }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface-bg border-2 border-border-subtle flex items-center justify-center shadow-lg group-hover:border-[var(--accent)] group-hover:bg-[var(--accent-soft)] transition-all mb-2 sm:mb-3">
                      <Icon className={`w-8 h-8 sm:w-10 sm:h-10 ${tech.color} group-hover:scale-110 transition-transform`} />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-text-secondary group-hover:text-[var(--accent)] transition-colors text-center">
                      {tech.name}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Experience Section */}
        <section id="experience" ref={experienceRef} className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={experienceInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="mb-8 sm:mb-12"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className="h-1 w-8 sm:w-12 bg-[var(--accent)] rounded-full"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--accent)] uppercase tracking-wide">Experience</h2>
              </div>
            </motion.div>

            <div className="space-y-6 sm:space-y-8">
              {experiences.map((exp, index) => (
                <motion.div
                  key={`${exp.company}-${index}`}
                  initial={{ opacity: 0, x: -30 }}
                  animate={experienceInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                  className="bg-surface-bg rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border-l-4 border-[var(--accent)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">{exp.role}</h3>
                      <div className="flex items-center gap-2 text-[var(--accent)] font-semibold mb-2">
                        <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
                        {exp.company}
                      </div>
                      <div className="flex items-center gap-2 text-text-secondary text-sm sm:text-base">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                        {exp.location}
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 text-left sm:text-right">
                      <div className="flex items-center gap-2 text-text-secondary mb-2 sm:justify-end text-sm sm:text-base">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        {exp.period}
                      </div>
                      <span className="inline-block px-3 sm:px-4 py-1 text-xs sm:text-sm font-semibold bg-[var(--accent)] text-white rounded-full">
                        {exp.type}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-2 sm:space-y-3">
                    {exp.achievements.map((achievement, idx) => (
                      <li key={idx} className="flex items-start gap-2 sm:gap-3 text-text-secondary p-2 sm:p-3 rounded-lg hover:bg-[var(--accent-soft)] transition-colors text-sm sm:text-base">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] mt-0.5 sm:mt-1 flex-shrink-0" />
                        <span>{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-content-bg">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="h-1 w-6 sm:w-12 bg-[var(--accent)] rounded-full"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--accent)] uppercase tracking-wide">Get In Touch</h2>
                <div className="h-1 w-6 sm:w-12 bg-[var(--accent)] rounded-full"></div>
              </div>
              <p className="text-text-secondary text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
                I'm always open to discussing backend engineering opportunities, interesting projects, or just having a chat about technology.
              </p>
              <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4">
                <motion.a
                  href={cvLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-text-primary hover:text-[var(--accent)] transition-colors font-semibold text-sm sm:text-base min-h-[44px]"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  Resume
                </motion.a>
                <motion.a
                  href="https://www.github.com/successamust"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-border-subtle flex items-center justify-center hover:border-[var(--accent)] hover:bg-[var(--accent)] transition-all group min-h-[44px] min-w-[44px]"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Github className="w-5 h-5 text-text-primary group-hover:text-white transition-colors" />
                </motion.a>
                <motion.a
                  href="https://www.linkedin.com/in/fataiopeyemi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-border-subtle flex items-center justify-center hover:border-[var(--accent)] hover:bg-[var(--accent)] transition-all group min-h-[44px] min-w-[44px]"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Linkedin className="w-5 h-5 text-text-primary group-hover:text-white transition-colors" />
                </motion.a>
                <motion.a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-border-subtle flex items-center justify-center hover:border-[var(--accent)] hover:bg-[var(--accent)] transition-all group min-h-[44px] min-w-[44px]"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <SiWhatsapp className="w-5 h-5 text-text-primary group-hover:text-white transition-colors" />
                </motion.a>
                <motion.a
                  href="mailto:fosalami1@gmail.com?subject=Portfolio%20Inquiry"
                  aria-label="Send email to Fatai Salami"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-border-subtle flex items-center justify-center hover:border-[var(--accent)] hover:bg-[var(--accent)] transition-all group min-h-[44px] min-w-[44px]"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Mail className="w-5 h-5 text-text-primary group-hover:text-white transition-colors" />
                </motion.a>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Portfolio;
