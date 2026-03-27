"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function ConstellationBackground({
  className,
  children,
  count = 80,
  connectionDistance = 150,
  /** NOVA-adjacent violet; reads on light and dark backgrounds */
  nodeColor = "rgba(105, 85, 205, 0.75)",
  lineColor = "rgba(105, 85, 205, 0.14)",
  nodeSize = 2,
  mouseRadius = 100,
  glow = true
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = container.getBoundingClientRect()
    let width = rect.width
    let height = rect.height
    canvas.width = width
    canvas.height = height

    let animationId
    let mouseX = -1000
    let mouseY = -1000

    // Create nodes
    const createNode = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * nodeSize + nodeSize * 0.5
    })

    const nodes = Array.from({ length: count }, createNode)

    // Mouse handlers
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouseX = -1000
      mouseY = -1000
    }

    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("mouseleave", handleMouseLeave)

    // Resize handler
    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width
      canvas.height = height
    }

    const ro = new ResizeObserver(handleResize)
    ro.observe(container)

    // Animation
    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      // Update and draw nodes
      for (const node of nodes) {
        // Mouse repulsion
        if (mouseRadius > 0) {
          const dx = node.x - mouseX
          const dy = node.y - mouseY
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < mouseRadius && dist > 0) {
            const force = ((mouseRadius - dist) / mouseRadius) * 0.02
            node.vx += (dx / dist) * force
            node.vy += (dy / dist) * force
          }
        }

        // Apply velocity with damping
        node.x += node.vx
        node.y += node.vy
        node.vx *= 0.99
        node.vy *= 0.99

        // Add slight random movement
        node.vx += (Math.random() - 0.5) * 0.01
        node.vy += (Math.random() - 0.5) * 0.01

        // Bounce off edges
        if (node.x < 0 || node.x > width) {
          node.vx *= -1
          node.x = Math.max(0, Math.min(width, node.x))
        }
        if (node.y < 0 || node.y > height) {
          node.vy *= -1
          node.y = Math.max(0, Math.min(height, node.y))
        }
      }

      // Draw connections
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < connectionDistance) {
            const opacity = 1 - dist / connectionDistance
            ctx.globalAlpha = opacity * 0.5
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      ctx.globalAlpha = 1
      for (const node of nodes) {
        // Glow
        if (glow) {
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 4)
          gradient.addColorStop(0, nodeColor.replace(/,([\d.]+)\)$/, ", 0.28)"))
          gradient.addColorStop(1, "transparent")
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(node.x, node.y, node.radius * 4, 0, Math.PI * 2)
          ctx.fill()
        }

        // Core
        ctx.fillStyle = nodeColor
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("mouseleave", handleMouseLeave)
      ro.disconnect()
    };
  }, [count, connectionDistance, nodeColor, lineColor, nodeSize, mouseRadius, glow])

  return (
    <div
      ref={containerRef}
      className={cn("fixed inset-0 z-0 overflow-hidden bg-background", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Primary glow — uses theme token */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.4]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, color-mix(in oklch, var(--primary) 18%, transparent) 0%, transparent 58%)",
        }}
      />
      {/* Vignette: subtle in light, deeper in dark */}
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 52%, oklch(0.35 0.06 285 / 0.14) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 48%, oklch(0.08 0.04 285 / 0.82) 100%)",
        }}
      />
      {children && (
        <div className="relative z-10 flex h-full min-h-0 w-full flex-col">{children}</div>
      )}
    </div>
  );
}

export default function ConstellationBackgroundDemo() {
  return <ConstellationBackground />;
}
