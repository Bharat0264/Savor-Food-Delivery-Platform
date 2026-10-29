"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Leaf,
  Clock,
  Star,
  MoveDown,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useDemo } from "./provider";
import { MerchantCard } from "./ui";
import { copy } from "@/lib/copy";
import { SceneBoundary } from "./scene-boundary";
const Scene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => (
    <img
      className="scene-fallback"
      src="/images/food.jpg"
      alt="Fresh vegetable bowl"
    />
  ),
});
export function Home() {
  const { state } = useDemo();
  const root = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [sceneVisible, setSceneVisible] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setSceneVisible(entry.isIntersecting),
      { rootMargin: "100px" },
    );
    if (sceneRef.current) observer.observe(sceneRef.current);
    return () => observer.disconnect();
  }, []);
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = useState(false);
  useEffect(() => {
    const c = document.createElement("canvas");
    setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl")));
  }, []);
  useEffect(() => {
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) =>
        gsap.fromTo(
          el,
          { y: 65, opacity: 0.15 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            scrollTrigger: {
              trigger: el,
              start: "top 92%",
              end: "top 60%",
              scrub: 1,
            },
          },
        ),
      );
      gsap.to(".hero-visual", {
        y: 90,
        rotation: 7,
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
      gsap.fromTo(
        ".story-photo",
        { clipPath: "inset(12% 12% 12% 12% round 100px)" },
        {
          clipPath: "inset(0% 0% 0% 0% round 24px)",
          scrollTrigger: {
            trigger: ".story",
            start: "top 85%",
            end: "top 30%",
            scrub: 1,
          },
        },
      );
    }, root);
    return () => ctx.revert();
  }, [reduced]);
  return (
    <div ref={root}>
      <section className="hero">
        <div className="hero-copy">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="eyebrow"
          >
            <span /> {copy.hero.eyebrow}
          </motion.div>
          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            {copy.hero.lineOne}
            <br />
            {copy.hero.lineTwo}{" "}
            <em>
              {copy.hero.accentOne}
              <br className="desktop-break" /> {copy.hero.accentTwo}
            </em>
            <span className="headline-spark">✳</span>
          </motion.h1>
          <motion.p
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {copy.hero.descriptionOne}
            <br />
            {copy.hero.descriptionTwo}
          </motion.p>
          <div className="hero-buttons">
            <Link href="/food" className="btn">
              {copy.hero.foodAction} <ArrowUpRight size={19} />
            </Link>
            <Link href="/grocery" className="btn light">
              {copy.hero.groceryAction} <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="social-proof">
            <div className="avatars">
              <span>AK</span>
              <span>PN</span>
              <span>SR</span>
            </div>
            <div>
              <div className="stars">★★★★★</div>
              <small>{copy.hero.socialProof}</small>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="visual-label">
            FRESHLY MADE.
            <br />
            HAPPILY DELIVERED.
          </span>
          <div className="scene" ref={sceneRef}>
            {webgl && !reduced && sceneVisible ? (
              <SceneBoundary>
                <Scene />
              </SceneBoundary>
            ) : (
              <img
                className="scene-fallback"
                src="/images/food.jpg"
                alt="Freshly made vegetable bowl"
              />
            )}
          </div>
          <div className="floating-tag tag-fresh">
            <span className="tag-icon">
              <Leaf size={20} />
            </span>
            <div>
              <strong>Nothing but goodness</strong>
              <small>Fresh ingredients. Real flavour.</small>
            </div>
          </div>
          <div className="floating-tag tag-time">
            <span className="tag-icon">
              <Clock size={20} />
            </span>
            <div>
              <strong>At your door in 25 min</strong>
              <small>A little less waiting. A lot more living.</small>
            </div>
          </div>
          <span className="scene-note">A BOWL FULL OF POSSIBILITY ↗</span>
          <span className="visual-star">✺</span>
        </div>
        <div className="hero-bottom">
          <span>GOOD TASTE. GREAT NEIGHBOURS.</span>
          <a href="#discover">
            SCROLL TO DISCOVER <MoveDown size={14} />
          </a>
          <span>01 — THE EVERYDAY, ELEVATED</span>
        </div>
      </section>
      <div className="marquee">
        <span>
          Locally loved <i>✳</i> Freshly picked <i>✳</i> Thoughtfully delivered{" "}
          <i>✳</i> Made for your everyday <i>✳</i>
        </span>
      </div>
      <section className="section" id="discover">
        <div className="section-heading reveal">
          <div>
            <div className="eyebrow">TWO WAYS TO MAKE YOUR DAY</div>
            <h2>
              Whatever your day <em>calls for.</em>
            </h2>
          </div>
          <p>
            Big cravings. Small essentials.
            <br />
            We’ve got a good thing for both.
          </p>
        </div>
        <div className="world-grid">
          <Link href="/food" className="world food-world reveal">
            <div>
              <span className="eyebrow">01 / A LITTLE INDULGENCE</span>
              <h3>
                Good mood.
                <br />
                Great food.
              </h3>
              <p>Your city’s best kitchens, one craving away.</p>
              <span className="circle-arrow">
                <ArrowUpRight />
              </span>
            </div>
            <img
              src="/images/pizza.jpg"
              alt="Artisanal Italian pizza"
              loading="lazy"
            />
          </Link>
          <Link href="/grocery" className="world grocery-world reveal">
            <div>
              <span className="eyebrow">02 / EVERYDAY GOODNESS</span>
              <h3>
                Fresh finds.
                <br />
                Full hearts.
              </h3>
              <p>From farm-fresh to pantry-perfect.</p>
              <span className="circle-arrow">
                <ArrowUpRight />
              </span>
            </div>
            <img
              src="/images/grocery.jpg"
              alt="Fresh local grocery selection"
              loading="lazy"
            />
          </Link>
        </div>
      </section>
      <section className="section">
        <div className="section-heading reveal">
          <div>
            <div className="eyebrow">THE LOCAL LOVE LIST</div>
            <h2>
              Good places. <em>Great taste.</em>
            </h2>
          </div>
          <Link className="text-link" href="/food">
            Explore all restaurants <ArrowRight size={17} />
          </Link>
        </div>
        <div className="merchant-grid">
          {state.merchants
            .filter((m) => m.kind === "food" && m.approved)
            .slice(0, 3)
            .map((m) => (
              <MerchantCard key={m.id} merchant={m} />
            ))}
        </div>
      </section>
      <section className="offer-banner reveal">
        <span className="offer-star">✳</span>
        <div>
          <div className="eyebrow">
            YOUR FIRST BITE IS ON US. WELL, A LITTLE OF IT.
          </div>
          <h2>
            A fresh start. <em>₹100 off.</em>
          </h2>
          <p>
            Good things begin with a little treat. Use FIRSTBITE on orders over
            ₹499.
          </p>
        </div>
        <Link className="btn light" href="/offers">
          Find your first favourite <ArrowUpRight size={18} />
        </Link>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">FRESH FROM YOUR NEIGHBOURHOOD</div>
            <h2>
              Stock up on <em>the good stuff.</em>
            </h2>
          </div>
          <Link className="text-link" href="/grocery">
            Explore stores <ArrowRight size={17} />
          </Link>
        </div>
        <div className="merchant-grid">
          {state.merchants
            .filter((m) => m.kind === "grocery")
            .map((m) => (
              <MerchantCard key={m.id} merchant={m} />
            ))}
          <div className="fresh-note">
            <Leaf size={38} />
            <h3>
              A fresher kind
              <br />
              of everyday.
            </h3>
            <p>
              Local stores. Seasonal produce.
              <br />
              Less time shopping, more time living.
            </p>
            <Link href="/grocery">
              Discover the difference <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>
      <section className="story section">
        <img
          className="story-photo"
          src="/images/salad.jpg"
          alt="A colourful meal made with fresh ingredients"
          loading="lazy"
        />
        <div className="reveal">
          <div className="eyebrow">MORE THAN A DELIVERY</div>
          <h2>
            A little closer
            <br />
            to <em>what matters.</em>
          </h2>
          <p>
            The familiar kitchen around the corner. The grocer who knows what’s
            in season. We bring the best of your neighbourhood a little closer,
            so you can make more room for life.
          </p>
          <Link className="btn" href="/food">
            Meet your neighbourhood <ArrowUpRight size={18} />
          </Link>
          <div className="story-values">
            <span>
              <Leaf />
              Fresh, always
            </span>
            <span>
              <Star />
              Locally loved
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
