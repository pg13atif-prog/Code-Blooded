import { motion } from "framer-motion";
import "./SplashScreen.css";

function SplashScreen({ onComplete }) {
  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        y: -50,
        transition: { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }
      }}
    >
      <div className="splash-content">
        {/* Animated Background Glow */}
        <motion.div 
          className="splash-glow"
          initial={{ scale: 0.8, opacity: 0.3 }}
          animate={{ 
            scale: [0.8, 1.2, 0.8],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <div className="logo-container">
          {/* Circular border drawing animation */}
          <svg className="logo-ring-svg" viewBox="0 0 100 100">
            <defs>
              <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Subtle background track */}
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="rgba(229, 9, 20, 0.15)"
              strokeWidth="2"
              fill="transparent"
            />
            {/* Enhanced glowing animated ring */}
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              stroke="#e50914"
              strokeWidth="3.5"
              fill="transparent"
              strokeLinecap="round"
              filter="url(#neon-glow)"
              initial={{ pathLength: 0, rotate: -90 }}
              animate={{ 
                pathLength: [0, 1, 1],
                rotate: [-90, 270, 630]
              }}
              transition={{ 
                duration: 2.2, 
                ease: [0.22, 1, 0.36, 1],
                times: [0, 0.75, 1]
              }}
            />
          </svg>

          {/* Logo image scaling in */}
          <motion.img
            src="/favicon.png"
            alt="CineScope Logo"
            className="splash-logo"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 15,
              delay: 0.3
            }}
          />
        </div>

        {/* Text Animation: Smooth Fade from Left */}
        <motion.h1
          className="splash-title"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            duration: 1.0, 
            ease: [0.25, 1, 0.5, 1], 
            delay: 0.6 
          }}
        >
          CineScope
        </motion.h1>

        <motion.p
          className="splash-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          Your Ultimate Cinema Companion
        </motion.p>

        {/* Loading progress bar */}
        <div className="splash-progress-bar">
          <motion.div
            className="splash-progress-fill"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
            onAnimationComplete={onComplete}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default SplashScreen;
