import { motion } from "framer-motion"

interface ShiningTextProps {
  text: string
  className?: string
}

export function ShiningText({ text, className = "" }: ShiningTextProps) {
  return (
    <motion.span
      className={`shining-text ${className}`}
      style={{
        background: "linear-gradient(110deg, #404040, 35%, #ffffff, 50%, #404040, 75%, #404040)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        color: "transparent",
        fontSize: "14px",
        fontWeight: "400",
        display: "inline-block",
      }}
      initial={{ backgroundPosition: "200% 0" }}
      animate={{ backgroundPosition: "-200% 0" }}
      transition={{
        repeat: Infinity,
        duration: 2,
        ease: "linear",
      }}
    >
      {text}
    </motion.span>
  )
}
