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
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              stroke="#e50914"
              strokeWidth="3"
              fill="transparent"
              initial={{ pathLength: 0, rotate: -90 }}
              animate={{ pathLength: 1, rotate: 270 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
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

        {/* Text Animation */}
        <motion.h1
          className="splash-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {"CineScope".split("").map((char, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.05 }}
            >
              {char}
            </motion.span>
          ))}
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
