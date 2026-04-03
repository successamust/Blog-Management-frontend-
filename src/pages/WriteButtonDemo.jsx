import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import WriteButton from '../components/common/WriteButton';
import Seo, { DEFAULT_OG_IMAGE } from '../components/common/Seo';

const DEMO_DESCRIPTION =
  'Preview the neumorphic Write button used across Nexus. This route is for design QA only.';

const WriteButtonDemo = () => {
  const navigate = useNavigate();

  const handleWriteClick = () => {
    navigate('/dashboard?tab=create-post');
  };

  return (
    <>
      <Seo
        title="Write button demo"
        description={DEMO_DESCRIPTION}
        url="/write-button-demo"
        image={DEFAULT_OG_IMAGE}
      />
      <div className="bg-page min-h-[70vh]">
        <section className="page-hero-strip">
          <div className="pointer-events-none absolute inset-0 hero-mesh" aria-hidden />
          <div className="layout-container max-w-3xl mx-auto py-12 md:py-14 relative z-[1]">
            <Link
              to="/"
              className="inline-flex text-sm text-secondary hover:text-[var(--accent)] transition-colors mb-6"
            >
              ← Back to home
            </Link>
            <p className="font-sans text-[11px] uppercase tracking-[0.28em] text-[var(--text-muted)] mb-3">
              Design QA
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-primary mb-3">Write button</h1>
            <p className="text-secondary text-sm sm:text-base max-w-xl">{DEMO_DESCRIPTION}</p>
          </div>
        </section>
        <div className="bg-content">
          <div className="layout-container max-w-3xl mx-auto section-spacing-y flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="card-elevated rounded-3xl p-10 sm:p-14 w-full flex flex-col items-center justify-center min-h-[280px]"
            >
              <p className="text-sm text-muted mb-8 text-center max-w-sm">
                Tap the control to open the author create-post flow (same as production).
              </p>
              <div className="neumorphic-container">
                <WriteButton onClick={handleWriteClick} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WriteButtonDemo;
