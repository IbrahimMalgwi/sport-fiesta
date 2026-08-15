// app/page.jsx — public Welcome page (Server Component; HeroSection is client)
import Link from "next/link";
import HeroSection from "@/components/HeroSection";
import { HOUSES as TEAMS } from "@/utils/houseMapping";

export default function WelcomePage() {
    return (
        <div className="min-h-screen">
            <HeroSection />

            <section className="py-12 md:py-16 bg-gradient-to-b from-gray-900 to-gray-800 text-white px-4">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        About Sports Fiesta 5.0
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
                        <div className="bg-indigo-900/50 p-4 md:p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-indigo-700/30">
                            <div className="text-3xl md:text-4xl mb-3 md:mb-4">🏆</div>
                            <h3 className="text-lg md:text-xl font-semibold mb-2">Competitive Events</h3>
                            <p className="text-indigo-200 text-sm md:text-base">Multiple sports categories with junior and senior divisions for all participants.</p>
                        </div>
                        <div className="bg-indigo-900/50 p-4 md:p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-indigo-700/30">
                            <div className="text-3xl md:text-4xl mb-3 md:mb-4">👥</div>
                            <h3 className="text-lg md:text-xl font-semibold mb-2">Team Spirit</h3>
                            <p className="text-indigo-200 text-sm md:text-base">Four teams competing with values of faith, healing, salvation, and hope.</p>
                        </div>
                        <div className="bg-indigo-900/50 p-4 md:p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-indigo-700/30">
                            <div className="text-3xl md:text-4xl mb-3 md:mb-4">🙏</div>
                            <h3 className="text-lg md:text-xl font-semibold mb-2">Spiritual Growth</h3>
                            <p className="text-indigo-200 text-sm md:text-base">Opportunities for decisions for Christ and Holy Ghost baptism.</p>
                        </div>
                    </div>

                    <div className="mb-8 md:mb-12">
                        <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Our Teams</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            {Object.keys(TEAMS).map((teamKey) => {
                                const team = TEAMS[teamKey];
                                return (
                                    <div
                                        key={teamKey}
                                        className="p-3 md:p-4 rounded-2xl text-center text-white shadow-md border-l-4"
                                        style={{
                                            background: `linear-gradient(135deg, ${team.color}20, ${team.color}10)`,
                                            borderLeftColor: team.color,
                                        }}
                                    >
                                        <div
                                            className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3 text-white font-bold"
                                            style={{ backgroundColor: team.color }}
                                        >
                                            {teamKey.charAt(0)}
                                        </div>
                                        <div className="font-semibold text-xs md:text-sm">{team.name}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-indigo-900 p-6 md:p-8 rounded-2xl shadow-xl max-w-3xl mx-auto border border-indigo-700">
                        <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Join Us Today!</h3>
                        <p className="mb-4 md:mb-6 text-indigo-200 text-sm md:text-base">
                            Register now to be part of this exciting event where sports meet faith and community.
                            Whether you&rsquo;re a participant, volunteer, or supporter, there&rsquo;s a place for you!
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
                            <Link href="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 md:py-3 px-5 md:px-6 rounded-lg transition-colors text-sm md:text-base text-center">
                                Register as Participant
                            </Link>
                            <Link href="/staff-registration" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 md:py-3 px-5 md:px-6 rounded-lg transition-colors text-sm md:text-base text-center">
                                Register as Staff
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
