/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // This app lives in a subdirectory of the CRA repo; pin the tracing root to
    // web-next so Next doesn't infer the parent repo from its lockfile.
    outputFileTracingRoot: import.meta.dirname,
    // Profile pictures live in a Supabase Storage bucket once wired up.
    // Add the project's storage hostname here when credentials are set.
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "*.supabase.co" },
        ],
    },
};

export default nextConfig;
