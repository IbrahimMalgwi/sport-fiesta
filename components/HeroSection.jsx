"use client";
// components/HeroSection.jsx
// Ported to next/link. styled-jsx (<style jsx>) is bundled with Next, so the
// inline animations work unchanged.
import React, { useState, useEffect } from "react";
import Link from "next/link";

const CAROUSEL_IMAGES = [
    "https://images.unsplash.com/photo-1552667466-07770ae110d0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1549060279-7e168fce7090?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
];

export default function HeroSection() {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const goToSlide = (index) => setCurrentSlide(index);
    const goToNextSlide = () =>
        setCurrentSlide((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    const goToPrevSlide = () =>
        setCurrentSlide((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length);

    return (
        <div className="relative min-h-screen min-h-[100dvh] overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="absolute rounded-full opacity-10 animate-float"
                        style={{
                            width: `${100 + i * 50}px`,
                            height: `${100 + i * 50}px`,
                            top: `${20 + i * 10}%`,
                            left: `${i * 20}%`,
                            backgroundColor: i % 4 === 0 ? '#FF0000' : i % 4 === 1 ? '#0000FF' : i % 4 === 2 ? '#FFD700' : '#800080',
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${15 + i * 2}s`
                        }}
                    />
                ))}
            </div>

            {/* Carousel — absolutely filled against the section, which is now
                sized by the (normal-flow) content below rather than the other
                way around, so the background always covers however tall the
                hero ends up being on any given screen. */}
            <div className="absolute inset-0">
                {CAROUSEL_IMAGES.map((image, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${
                            index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-110"
                        }`}
                    >
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: `url(${image})` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-purple-900/80 to-indigo-900/90"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content — normal flow (not absolutely positioned) so on short
                viewports where the badge+heading+CTA card don't all fit, the
                section grows and the page scrolls instead of silently
                clipping the buttons. min-h keeps it looking full-bleed on
                screens tall enough to fit everything. */}
            <div className="relative z-10 flex min-h-screen min-h-[100dvh] items-center justify-center text-center px-4 py-20 sm:py-24">
                <div className="text-white max-w-4xl mx-auto w-full transform transition-all duration-1000">
                    <div className="mb-5 sm:mb-6">
                        <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-xs sm:text-sm md:text-base mb-4 shadow-lg">
                            🏆 Annual Sports Event
                        </div>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent px-2 leading-tight">
                        Sports Fiesta <span className="text-yellow-400">5.0</span>
                    </h1>

                    <div className="relative inline-block mb-5 sm:mb-6">
                        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl mb-2 font-light text-indigo-200 relative z-10">
                            All Winners in Christ
                        </p>
                        <div className="absolute bottom-0 left-0 w-full h-2 bg-yellow-400/40 transform -rotate-2 -z-0"></div>
                    </div>

                    {/* Join Us Section */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 md:p-8 mb-8 border border-white/20">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Join Us Today!</h2>
                        <p className="text-base sm:text-lg md:text-xl mb-5 sm:mb-6 text-indigo-100 max-w-2xl mx-auto">
                            Register now to be part of this exciting event where sports meet faith and community.
                            Whether you&rsquo;re a participant, volunteer, or supporter, there&rsquo;s a place for you!
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                            <Link
                                href="/register"
                                className="relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-3 px-5 sm:px-6 rounded-xl text-sm sm:text-base md:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/30 flex items-center justify-center"
                            >
                                <span className="relative z-10 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Register A Participant
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            </Link>

                            <Link
                                href="/staff-registration"
                                className="relative overflow-hidden group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-5 sm:px-6 rounded-xl text-sm sm:text-base md:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/30 flex items-center justify-center"
                            >
                                <span className="relative z-10 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                                    </svg>
                                    Register Marshal
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            </Link>

                            <Link
                                href="/results"
                                className="relative overflow-hidden group bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold py-3 px-5 sm:px-6 rounded-xl text-sm sm:text-base md:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/30 flex items-center justify-center"
                            >
                                <span className="relative z-10 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Input Sporting Activities Data
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation arrows — hidden on the smallest screens: with the
                content now in normal flow (see above) the section can be
                taller than the viewport there, and top-1/2 would float mid-
                content instead of mid-viewport. The indicator dots below
                remain a reachable way to jump slides on any screen size. */}
            <button
                onClick={goToPrevSlide}
                className="hidden sm:block absolute left-4 md:left-8 top-1/2 transform -translate-y-1/2 bg-indigo-800/30 text-white p-3 md:p-4 rounded-full hover:bg-indigo-700/50 transition-all z-10 backdrop-blur-md border border-white/10 hover:border-white/20 shadow-lg"
                aria-label="Previous slide"
            >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <button
                onClick={goToNextSlide}
                className="hidden sm:block absolute right-4 md:right-8 top-1/2 transform -translate-y-1/2 bg-indigo-800/30 text-white p-3 md:p-4 rounded-full hover:bg-indigo-700/50 transition-all z-10 backdrop-blur-md border border-white/10 hover:border-white/20 shadow-lg"
                aria-label="Next slide"
            >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Indicators */}
            <div className="absolute bottom-3 sm:bottom-6 left-0 right-0 flex justify-center space-x-3 z-10">
                {CAROUSEL_IMAGES.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full transition-all duration-300 ${
                            index === currentSlide ? "bg-white scale-125" : "bg-indigo-300/60 hover:bg-indigo-200"
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>

            {/* Scroll indicator — hidden below sm: it sat almost directly on
                top of the indicator dots there, and scrolling is self-evident
                once content flows normally instead of being pinned full-bleed. */}
            <div className="hidden sm:block absolute bottom-14 sm:bottom-16 left-1/2 transform -translate-x-1/2 animate-bounce">
                <div className="flex flex-col items-center">
                    <span className="text-white/80 text-sm mb-1">Scroll Down</span>
                    <svg className="w-6 h-6 md:w-7 md:h-7 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                }
                .animate-fade-in { animation: fadeIn 1.2s ease-out forwards; }
                .animate-fade-in-delay { animation: fadeIn 1.2s ease-out 0.6s forwards; opacity: 0; }
                .animate-fade-in-delay-2 { animation: fadeIn 1.2s ease-out 1.2s forwards; opacity: 0; }
                .animate-float { animation: float 15s ease-in-out infinite; }
            `}</style>
        </div>
    );
}
